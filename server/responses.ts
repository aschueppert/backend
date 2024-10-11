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
    return
  }

  static async draft(draft: DraftDoc | null) {
    return
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    return
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
  const user2= (await Authing.getUserById(e.user2)).username;
  return e.formatWith(user2);
});
Router.registerError(NotFollowingError, async (e) => {
  const user2= (await Authing.getUserById(e.user2)).username;
  return e.formatWith(user2);
});

