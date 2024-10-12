import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Drafting, Events, Following, Posting, Saving, Sessioning } from "./app";
import { SessionDoc } from "./concepts/sessioning";

import { z } from "zod";
import Responses from "./responses";
Responses.draft;

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 * check 123
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }
  /**
   * Gets Approved Posts from the users that the current user is following.
   *
   * @param session - The session of the user creating the post.
   * @returns posts - The posts from users that the user is following.
   */
  @Router.get("/posts")
  async getFollowingPosts(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    let posts = await Posting.getPosts();
    let relationships = await Following.getFollowing(user);
    let following = relationships.map((r) => r.following);
    posts = posts.filter((post) => post.approvers.some((member) => following.map(String).includes(String(member))));
    posts = posts.filter((post) => post.status == "approved");
    return posts;
  }

  /**
   * Gets approved posts from a specific user.
   * @param session - The session of the user creating the post.
   * @param username - The username of the user whose posts are being fetched.
   */
  @Router.get("/posts/:user")
  async getUserPosts(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    const id = (await Authing.getUserByUsername(username))._id;
    let posts = await Posting.getByAuthor(id);
    if (String(id) != String(user)) {
      posts = posts.filter((post) => post.status == "approved");
    }
    return Responses.posts(posts);
  }

  /**
   * Gets approved posts from a specific theme from people the user follows.
   * @param session - The session of the user
   * @param theme - The theme of the posts
   * @returns posts - The posts from the theme.
   * */
  @Router.get("/themes")
  async getThemePosts(session: SessionDoc, theme: string) {
    const user = Sessioning.getUser(session);
    let relationships = await Following.getFollowing(user);
    let following = relationships.map((r) => r.following);
    let theme_posts = await Posting.getByTheme(theme);
    theme_posts = theme_posts.filter((post) => post.approvers.some((member) => following.map(String).includes(String(member))));
    theme_posts = theme_posts.filter((post) => post.status == "approved");
    return theme_posts;
  }

  /**
   * Get the users drafts.
   * @param session - The session of the user
   * @returns The users drafts.
   */
  @Router.get("/drafts")
  async getDrafts(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    let drafts = await Drafting.getByMember(user);
    return Responses.drafts(drafts);
  }

  /**
   * Gets items that user has saved
   * @param session- The session of the user
   * @returns items - The items that the user has saved
   */
  @Router.get("/saved")
  async getSaved(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    let saved = await Saving.getByAuthor(user);
    return saved;
  }

  /**
   * Get events of approved posts from all users
   * @param session - The session of the user
   * @returns  events - The events from users that the user is following
   */
  @Router.get("/events")
  async getAllEvents() {
    let events = await Events.getEvents();
    let filter_events = await Promise.all(
      events.map(async (event) => ({
        event,
        isApproved: (await Posting.getStatus(event.info)) === "Approved",
      })),
    );
    let filtered_events = filter_events.filter(({ isApproved }) => isApproved).map(({ event }) => event);
    return Responses.events(filtered_events);
  }
  @Router.get("/events/me")
  async getMyEvents(session: SessionDoc) {
    let user = Sessioning.getUser(session);
    let events = await Events.getByHost(user);
    return Responses.events(events);
  }

  /**
   * Converts a draft into a post.
   * @param session THe session of the user
   * @param draft_id Draft to convert
   * @returns a post with the selected content of the draft
   */
  @Router.post("/posts")
  async convertDraft(session: SessionDoc, draft_id: string) {
    const user = Sessioning.getUser(session);
    const draft_oid = new ObjectId(draft_id);
    await Drafting.assertUserIsMember(draft_oid, user);
    const content = await Drafting.getContent(draft_oid);
    const members = await Drafting.getMembers(draft_oid);
    const created = await Posting.create(members, content);
    await Drafting.delete(draft_oid);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  /**
   * Creates a draft
   * @param session THe session of the user
   * @param content content to add to the draft
   * @returns Draft with the content
   */
  @Router.post("/drafts")
  async createDraft(session: SessionDoc, content: string) {
    const user = Sessioning.getUser(session);
    const created = await Drafting.create(user, content);
    return { msg: created.msg, draft: await Responses.draft(created.draft) };
  }

  /**
   * Creates an event
   * @param session the session of the user
   * @param post_id the post id to make an event
   * @param location the location of the event
   * @returns an event with the hosts=creators of post info=post and the location
   */
  @Router.post("/events")
  async createEvent(session: SessionDoc, post_id: string, location: string) {
    const user = Sessioning.getUser(session);
    const post_oid = new ObjectId(post_id);
    await Posting.assertUserIsApprover(post_oid, user);
    const hosts = await Posting.getApprovers(post_oid);
    let created = await Events.create(hosts, post_oid, location);
    return { msg: created.msg, event: await Responses.event(created.event) };
  }

  /**
   * Adds a user to the attendees of an event
   * @param session the session of the user
   * @param event_id the id of the event
   * @returns message that user was added to the vent
   */
  @Router.patch("/events/rsvp/:id")
  async rsvpEvent(session: SessionDoc, event_id: string) {
    const user = Sessioning.getUser(session);
    const event_oid = new ObjectId(event_id);
    await Posting.assertIsApproved(await Events.getInfo(event_oid));
    return await Events.rsvpEvent(event_oid, user);
  }

  /**
   * Changes location of event to a new location
   * @param session the session of the user
   * @param event_id the id of the event
   * @param new_location the new location of the event
   * @returns message that the location was changed
   */
  @Router.patch("/events/location/:id")
  async changeLocation(session: SessionDoc, event_id: string, new_location: string) {
    const user = Sessioning.getUser(session);
    const event_oid = new ObjectId(event_id);
    await Events.assertUserIsHost(event_oid, user);
    return await Events.changeLocation(event_oid, new_location);
  }

  /**
   * Selects content from contentSet of a draft (add to selectedSet)
   * @param session the session of the user
   * @param id the id of the draft
   * @param content the content to select
   * @returns msg that content was selected
   */
  @Router.patch("/drafts/select/:id")
  async selectContent(session: SessionDoc, id: string, content: string) {
    const user = Sessioning.getUser(session);
    const draft_id = new ObjectId(id);
    await Drafting.assertUserIsMember(draft_id, user);
    return await Drafting.select(draft_id, content);
  }

  /**
   * Deselects content from selectedSet of a draft (removes from selected set)
   * @param session the session of the user
   * @param id the id of the draft
   * @param content the content to deselect
   * @returns msg that content was deselected
   */
  @Router.patch("/drafts/deselect/:id")
  async deselectContent(session: SessionDoc, id: string, content: string) {
    const user = Sessioning.getUser(session);
    const draft_id = new ObjectId(id);
    await Drafting.assertUserIsMember(draft_id, user);
    return await Drafting.deselect(draft_id, content);
  }

  /**
   * Adds a user (in appovers set of post) to the approved set of a post
   * @param session the session of the user
   * @param id the id of the post
   * @returns msg that user is added
   */

  @Router.patch("/posts/approve/:id")
  async approve(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const post_id = new ObjectId(id);
    await Posting.assertUserCanApprove(post_id, user);
    return await Posting.approvePost(post_id, user);
  }
  /**
   * Sets the theme of a post
   * @param session the session of the user
   *  @param id the id of the post
   * @param theme the theme to set
   * @returns msg that theme was set
   * */
  @Router.patch("/posts/theme/:id")
  async setTheme(session: SessionDoc, id: string, theme: string) {
    const user = Sessioning.getUser(session);
    const post_id = new ObjectId(id);
    await Posting.assertUserIsApprover(post_id, user);
    await Posting.assertThemeIsValid(theme);
    return await Posting.setTheme(post_id, theme);
  }

  /**
   * Adds content to contentSet of a draft
   * @param session the session of the user
   * @param id the id of the draft
   * @param content the content to add
   * @returns msg that content was added
   * */

  @Router.patch("/drafts/add/:id")
  async addContent(session: SessionDoc, id: string, content: string) {
    const user = Sessioning.getUser(session);
    const draft_id = new ObjectId(id);
    await Drafting.assertUserIsMember(draft_id, user);
    return await Drafting.addContent(draft_id, content);
  }
  /** Adds a member to members of draft
   * @param session the session of the user
   *  @param id the id of the draft
   * @param member the member to add
   * @returns msg that member was added
   * */

  @Router.patch("/drafts/:id")
  async addDraftMember(session: SessionDoc, id: string, member: string) {
    const other_id = (await Authing.getUserByUsername(member))._id;
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Drafting.assertUserIsMember(oid, user);
    await Drafting.assertUserIsNotMember(oid, other_id);
    return await Drafting.addMember(oid, other_id);
  }

  /**
   * Deletes a post
   * @param session the session of the user
   * @param id the id of the post
   * @returns msg that post was deleted
   * */

  @Router.delete("/posts/delete/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertUserIsApprover(oid, user);
    return Posting.delete(oid);
  }

  /**
   * Deletes a draft
   * @param session the session of the user
   * @param id the id of the draft
   * @returns msg that draft was deleted
   * */
  @Router.delete("/drafts/delete/:id")
  async deleteDraft(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Drafting.assertUserIsMember(oid, user);
    return Drafting.delete(oid);
  }
  /**
   * Deletes an event
   * @param session the session of the user
   * @param id the id of the event
   * @returns msg that event was deleted
   **/

  @Router.delete("/event/delete/:id")
  async deleteEvent(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Events.assertUserIsHost(oid, user);
    return Events.delete(oid);
  }

  /**
   * Deletes a save
   * @param session the session of the user
   * @param id the id of the save
   * @returns msg that save was deleted
   **/

  @Router.post("/save")
  async createSave(session: SessionDoc, name: string) {
    const user = Sessioning.getUser(session);
    return await Saving.create(user, name);
  }

  /**
   * Saves an item to a save
   * @param session the session of the user
   * @param _id the id of the item
   * @param name the name of the save
   * @returns msg that item was saved
   **/

  @Router.patch("/save")
  async saveItem(session: SessionDoc, _id: string, name: string) {
    const oid = new ObjectId(_id);
    const user = Sessioning.getUser(session);
    const save_oid = (await Saving.getSave(user, name))._id;
    return Saving.save(save_oid, oid);
  }

  /**
   * Deletes a save
   * @param session the session of the user
   * @param name the name of the save
   * @returns msg that save was deleted
   **/
  @Router.get("/follows")
  async getFollowing(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    let created = await Following.getFollowing(user);
    return Responses.follows(created);
  }

  /**
   * Follows a user
   * @param session the session of the user
   * @param username the username of the user to follow
   * @returns msg that user was followed
   * */
  @Router.post("/follows")
  async follow(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    const following = (await Authing.getUserByUsername(username))._id;
    await Following.assertIsNotFollowing(user, following);
    return await Following.follow(user, following);
  }

  /**
   * Unfollows a user
   * @param session the session of the user
   * @param username the username of the user to unfollow
   * @returns msg that user was unfollowed
   * */
  @Router.delete("/follows/:follow")
  async unfollow(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(username))._id;
    await Following.assertIsFollowing(user, friendOid);
    return await Following.unfollow(user, friendOid);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
