import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FollowDoc extends BaseDoc {
  follower: ObjectId;
  following: ObjectId;
}


/**
 * concept: Following [User]
 */
export default class FriendingConcept {
  public readonly relationships: DocCollection<FollowDoc>;

  /**
   * Make an instance of Friending.
   */
  constructor(collectionName: string) {
    this.relationships = new DocCollection<FollowDoc>(collectionName);
  }
  
  async getFollowers(user: ObjectId) {
    return await this.relationships.readMany({ followee: user });
  }

  async getFollowing(user: ObjectId) {
    return await this.relationships.readMany({ follower: user });
  }

  async follow(follower: ObjectId, following: ObjectId) {
    await this.relationships.createOne({ follower, following });
    return { msg: "Followed!" };
  }

  async unfollow(follower: ObjectId, following: ObjectId) {
    await this.relationships.deleteOne({ follower, following });
    return { msg: "Unfollowed!" };
  }

  async assertIsFollowing(follower: ObjectId, following: ObjectId) {
    const relationship = await this.relationships.readOne({ follower
    , following });
    if (relationship == null) {
      throw new NotFollowingError(following);
    }
  }
  async assertIsNotFollowing(follower: ObjectId, following: ObjectId) {
    const relationship = await this.relationships.readOne({ follower
    , following });
    if (relationship != null) {
      throw new AlreadyFollowingError(following);
    }
  }

}


export class NotFollowingError extends NotFoundError {
  constructor(
    public readonly user2: ObjectId,
  ) {
    super("Not following {0}", user2);
  }
}

export class AlreadyFollowingError extends NotAllowedError {
  constructor(
    public readonly user2: ObjectId,
  ) {
    super("Alreadying following {0}!", user2);
  }
}
