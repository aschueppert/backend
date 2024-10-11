import AuthenticatingConcept from "./concepts/authenticating";
import DraftingConcept from "./concepts/drafting";
import EventsConcept from "./concepts/events";
import FollowingConcept from "./concepts/following";
import PostingConcept from "./concepts/posting";
import SavingConcept from "./concepts/saving";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Following = new FollowingConcept("relationships");
export const Drafting = new DraftingConcept("drafts");
export const Saving = new SavingConcept("saved");
export const Events = new EventsConcept("events");