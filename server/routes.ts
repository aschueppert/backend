import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Drafting, Events, Friending, Posting, Saving, Sessioning } from "./app";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

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

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() , theme: z.string().optional(), status: z.string().optional()}))
  async getPosts(author?: string, theme?: string, status?: string) {
    let posts = await Posting.getPosts()
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      let author_posts = await Posting.getByAuthor(id);
      posts = posts.filter(post => author_posts.map(String).includes(String(post)));
    } 
    if (theme) {
      let theme_posts = await Posting.getByTheme(theme);
      posts = posts.filter(post => theme_posts.map(String).includes(String(post)));
    }
    if (status) {
      let status_posts= await Posting.getByStatus(status);
      posts = posts.filter(post => status_posts.map(String).includes(String(post)));
    }
    return posts;
  }

  @Router.get("/drafts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getDrafts(author?: string) {
    let drafts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      drafts = await Drafting.getByMember(id);
    } else {
      drafts = await Drafting.getDrafts();
    }
    return drafts;
  }


  @Router.get("/saved")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getSaved(author?: string) {
    let saved;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      saved = await Saving.getByAuthor(id);
    } else {
      saved = await Saving.getSaved();
    }
    return saved;
  }
  @Router.get("/events")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getEvents(author?: string) {
    let events;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      events = await Events.getByHost(id);
    } else {
      events = await Events.getEvents();
    }
    return events;
  }


  @Router.post("/posts")
  async convertDraft(session:SessionDoc,draft_id:string){
    const user = Sessioning.getUser(session);
    const draft_oid = new ObjectId(draft_id);
    await Drafting.assertUserIsMember(draft_oid, user);
    const content=await Drafting.getContent(draft_oid)
    const members=await Drafting.getMembers(draft_oid)
    const created = await Posting.create(members, content);
    await Drafting.delete(draft_oid);
    return created;
    
  }


  @Router.post("/drafts")
  async createDraft(session: SessionDoc,content: string,) {
    const user = Sessioning.getUser(session);
    const created = await Drafting.create(user, content);
    return created;
  }

  @Router.post("/events")
  async createEvent(session: SessionDoc, post_id:string, location: string) {
    const user = Sessioning.getUser(session);
    const post_oid = new ObjectId(post_id);
    await Posting.assertUserIsApprover(post_oid, user);
    const hosts=await Posting.getApprovers(post_oid)
    return await Events.create(hosts,post_oid,location);
  }

  @Router.patch("/events/rsvp/:id")
  async rsvpEvent(session: SessionDoc, event_id:string) {
    const user = Sessioning.getUser(session);
    const event_oid = new ObjectId(event_id);
    return await Events.rsvpEvent(event_oid,user);
  }

  @Router.patch("/events/location/:id")
  async changeLocation(session: SessionDoc, event_id: string, new_location: string) {
    const user = Sessioning.getUser(session);
    const event_oid = new ObjectId(event_id);
    await Events.assertUserIsHost(event_oid, user);
    return await Events.changeLocation(event_oid,new_location);
  }

  @Router.patch("/drafts/select/:id")
  async selectContent(session: SessionDoc, id: string, content: string) {
    const user = Sessioning.getUser(session);
    const draft_id = new ObjectId(id);
    await Drafting.assertUserIsMember(draft_id, user);
    return await Drafting.select(draft_id,content);
  }

  @Router.patch("/drafts/deselect/:id")
  async deselectContent(session: SessionDoc, id: string, content: string) {
    const user = Sessioning.getUser(session);
    const draft_id = new ObjectId(id);
    await Drafting.assertUserIsMember(draft_id, user);
    return await Drafting.deselect(draft_id,content);
  }

  @Router.patch("/posts/approve/:id")
  async approve(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const post_id = new ObjectId(id);
    await Posting.assertUserCanApprove(post_id, user);
    return await Posting.approvePost(post_id,user);
  }

  @Router.patch("/posts/theme/:id")
  async setTheme(session: SessionDoc, id: string, theme:string) {
    const user = Sessioning.getUser(session);
    const post_id = new ObjectId(id);
    await Posting.assertUserCanApprove(post_id, user);
    await Posting.assertThemeIsValid(theme);
    return await Posting.setTheme(post_id,theme);
  }


  @Router.patch("/drafts/add/:id")
  async addContent(session: SessionDoc, id: string, content: string) {
    const user = Sessioning.getUser(session);
    const draft_id = new ObjectId(id);
    await Drafting.assertUserIsMember(draft_id, user);
    return await Drafting.addContent(draft_id,content);
  }
  
  @Router.patch("/drafts/:id")
  async addDraftMember(session: SessionDoc, id: string, member: string) {
    const other_id = (await Authing.getUserByUsername(member))._id;
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Drafting.assertUserIsMember(oid, user);
    return await Drafting.addMember(oid,other_id);
  }

  @Router.delete("/posts/delete/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertUserIsApprover(oid, user);
    return Posting.delete(oid);
  }

  @Router.delete("/drafts/delete/:id")
  async deleteDraft(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Drafting.assertUserIsMember(oid, user);
    return Drafting.delete(oid);
  }

  @Router.delete("/event/delete/:id")
  async deleteEvent(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Events.assertUserIsHost(oid, user);
    return Events.delete(oid);
  }


  @Router.post("/save")
  async createSave(session: SessionDoc, name: string) {
    const user = Sessioning.getUser(session);
    return await Saving.create(user,name);
  }
  
  @Router.patch("/save")
  async saveItem(session: SessionDoc, _id:string, name: string, ) {
    const oid = new ObjectId(_id);
    const user = Sessioning.getUser(session);
    const save_oid= (await Saving.getSave(user,name))._id;
    return Saving.save(save_oid,oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
