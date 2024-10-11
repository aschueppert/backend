import AuthenticatingConcept from "./concepts/authenticating";
import DraftingConcept from "./concepts/drafting";
import FriendingConcept from "./concepts/friending";
import PostingConcept from "./concepts/posting";
import SavingConcept from "./concepts/saving";
import SessioningConcept from "./concepts/sessioning";
import EventsConcept from "./concepts/events";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Drafting = new DraftingConcept("drafts");
export const Saving = new SavingConcept("saved");
export const Events = new EventsConcept("events");
