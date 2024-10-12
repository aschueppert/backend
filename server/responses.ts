import { Authing } from "./app";
import { DraftAuthorNotMatchError, DraftDoc } from "./concepts/drafting";
import { EventHostNotMatchError } from "./concepts/events";
import { AlreadyFollowingError, FollowDoc, NotFollowingError } from "./concepts/following";
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
  static async follow(follow: FollowDoc | null) {
    if (!follow) {
      return follow;
    }
    let follower = await Authing.getUserById(follow.follower);
    let followee = await Authing.getUserById(follow.following);
    let follower_username = follower.username;
    let followee_username = followee.username;
    return { ...follow, follower: follower_username, followee: followee_username };
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const approvers = posts.map((post) => post.approvers);
    const approved = posts.map((post) => post.approved);
    const approve_usernames = approvers.map(async (approve) => await Authing.idsToUsernames(approve));
    const approved_usernames = approved.map(async (approve) => await Authing.idsToUsernames(approve));
    return posts.map((post, i) => ({ ...post, approvers: approve_usernames[i], approved: approved_usernames[i] }));
  }

  static async drafts(drafts: DraftDoc[]) {
    const members = drafts.map((draft) => draft.members);
    const member_usernames = members.map(async (member_set) => await Authing.idsToUsernames(member_set));
    let usernames = await Promise.all(member_usernames);
    return drafts.map((draft, i) => ({ ...draft, members: usernames[i] }));
  }

  static async follows(follows: FollowDoc[]) {
    const followers = follows.map((follow) => follow.follower);
    const followees = follows.map((follow) => follow.following);
    const usernames = await Authing.idsToUsernames(followers.concat(followees));
    return follows.map((follow, i) => ({ ...follow, follower: usernames[i], followee: usernames[i + follows.length] }));
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
