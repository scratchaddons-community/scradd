import { defineEvent } from "strife.js";

import { persistedLeave, persistedRejoin } from "./persisted.ts";

defineEvent("guildMemberRemove", persistedLeave);
defineEvent("guildMemberAdd", persistedRejoin);
