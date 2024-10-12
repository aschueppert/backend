import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface EventDoc extends BaseDoc {
  hosts: Array<ObjectId>;
  attendees: Array<ObjectId>;
  location: String;
  info: ObjectId;
}

/**
 * concept: Events
 */
export default class EventsConcept {
  public readonly events: DocCollection<EventDoc>;

  /**
   * Make an instance of Events.
   */
  constructor(collectionName: string) {
    this.events = new DocCollection<EventDoc>(collectionName);
  }

  async create(hosts: Array<ObjectId>, info: ObjectId, location: String) {
    const attendees = new Array<ObjectId>();
    const _id = await this.events.createOne({ hosts, attendees, location, info });
    return { msg: "Event successfully created!", event: await this.events.readOne({ _id }) };
  }

  async getEvents() {
    // Returns all eevents! You might want to page for better client performance
    return await this.events.readMany({}, { sort: { _id: -1 } });
  }

  async getInfo(_id: ObjectId) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }
    return event.info;
  }

  async changeLocation(_id: ObjectId, location: String) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }
    await this.events.partialUpdateOne({ _id }, { location });
    return { msg: `Location changed to ${_id}` };
  }

  async rsvpEvent(_id: ObjectId, user: ObjectId) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }
    event.attendees.push(user);
    await this.events.partialUpdateOne({ _id }, { attendees: event.attendees });
    return { msg: "RSVP successful!" };
  }

  async getByHost(host: ObjectId) {
    return await this.events.readMany({ hosts: host });
  }

  async getAttendees(_id: ObjectId) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }
    return event.attendees;
  }

  async delete(_id: ObjectId) {
    await this.events.deleteOne({ _id });
    return { msg: "Event deleted successfully!" };
  }

  async assertUserIsHost(_id: ObjectId, user: ObjectId) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }

    if (!event.hosts.map(String).includes(String(user))) {
      throw new NotFoundError(`User ${user} is not a host of event ${_id}!`);
    }
  }
  async assertIsNotAttending(_id: ObjectId, user: ObjectId) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }
    if (event.attendees.map(String).includes(String(user))) {
      throw new NotAllowedError(`Already attending event ${_id}!`);
    }
  }
}
export class EventHostNotMatchError extends NotAllowedError {
  constructor(
    public readonly host: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not an host of event {1}!", host, _id);
  }
}
