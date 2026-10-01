import {
  getContactEntriesMockHandler,
  getContactsMockHandler,
  getCreateContactMockHandler,
  getCreateContactPaymentMockHandler,
  getCreateContactSplitMockHandler,
  getDeleteContactMockHandler,
  getDeleteContactPaymentMockHandler,
  getDeleteContactSplitMockHandler,
  getUpdateContactMockHandler,
  getUpdateContactSplitMockHandler,
} from "@/api/generated/contacts/contacts.msw";
import { contactEntries, contacts, dinnerSplit } from "@/storybook/fixtures";
import { found, query, readBody, text } from "./http";
import { NEW_ID } from "./ids";
import { byId, paginate } from "./lists";

export const contactHandlers = [
  getContactsMockHandler(contacts),
  getCreateContactMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: text((await readBody(request)).name) ?? "",
    balances: [],
  })),
  getUpdateContactMockHandler(async ({ params, request }) => {
    const contact = found(byId(contacts, params.id));
    return { ...contact, name: text((await readBody(request)).name) ?? contact.name };
  }),
  getDeleteContactMockHandler(),
  getContactEntriesMockHandler(({ request }) => paginate(contactEntries, query(request))),
  getCreateContactPaymentMockHandler(contactEntries[0]),
  getDeleteContactPaymentMockHandler(),
  getCreateContactSplitMockHandler(dinnerSplit),
  getUpdateContactSplitMockHandler(dinnerSplit),
  getDeleteContactSplitMockHandler(),
];
