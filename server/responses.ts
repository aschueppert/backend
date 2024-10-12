import { Authing } from "./app";
import { DraftAuthorNotMatchError, DraftDoc } from "./concepts/drafting";
import { EventHostNotMatchError } from "./concepts/events";
import { AlreadyFollowingError, NotFollowingError } from "./concepts/following";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/posting";
import { SaveAuthorNotMatchError } from "./concepts/saving";
import { Router } from "./framework/router";
/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    let approvers = post.approvers.map(async (approver) => await Authing.getUserById(approver));
    let full_approvers = await Promise.all(approvers);
    let approvers_usernames = full_approvers.map((approver) => approver.username);
    let approved = post.approved.map(async (approver) => await Authing.getUserById(approver));
    let full_approved = await Promise.all(approved);
    let approved_usernames = full_approved.map((approver) => approver.username);
    return { ...post, approvers: approvers_usernames, approved: approved_usernames };
  }

  static async draft(draft: DraftDoc | null) {
    if (!draft) {
      return draft;
    }
    let members = draft.members.map(async (member) => await Authing.getUserById(member));
    let full_members = await Promise.all(members);
    let usernames = full_members.map((member) => member.username);
    return { ...draft, members: usernames };
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const allAuthors = await Authing.idsToUsernames(posts.map((post) => post.approvers).flat());
    const allApproved = await Authing.idsToUsernames(posts.map((post) => post.approved).flat());
    let authorIndex = 0;
    let approvedIndex = 0;
    return posts.map((post) => {
      const authorsForPost = post.approvers.map(() => allAuthors[authorIndex++]);
      const approvedForPost = post.approved.map(() => allApproved[approvedIndex++]);
      return { ...post, approvers: authorsForPost, approved: approvedForPost };
    });
  }

  static async drafts(drafts: DraftDoc[]) {
    const allAuthors = await Authing.idsToUsernames(drafts.map((draft) => draft.members).flat());
    let authorIndex = 0;
    return drafts.map((draft) => {
      const membersforDraft = draft.members.map(() => allAuthors[authorIndex++]);
      return { ...draft, members: membersforDraft };
    });
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(DraftAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(EventHostNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.host)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(SaveAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(AlreadyFollowingError, async (e) => {
  console.log("Already following error");
  const user2 = (await Authing.getUserById(e.user2)).username;
  return e.formatWith(user2);
});
Router.registerError(NotFollowingError, async (e) => {
  const user2 = (await Authing.getUserById(e.user2)).username;
  return e.formatWith(user2);
});
