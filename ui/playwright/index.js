import HttpBackend from "i18next-http-backend";

import { IconSets, OrIconSet, createMdiIconSet, createSvgIconSet } from "@openremote/or-icon";
import { i18next } from "@openremote/or-translate";

IconSets.addIconSet("mdi", createMdiIconSet(""));
IconSets.addIconSet("or", createSvgIconSet(OrIconSet.size, OrIconSet.icons));

await i18next
  // TODO: the HTTP backend can only work after the request can be intercepted
  .use(HttpBackend)
  .init({
    lng: "en",
    fallbackLng: "en",
    defaultNS: "test",
    fallbackNS: "or",
    ns: ["test", "or"],
    backend: {
      loadPath: "/shared/locales/{{lng}}/{{ns}}.json",
      // loadPath: (lng, ns) => import(`../app/shared/locales/${lng}/${ns}.json`),
    },
  })
  .then(() => {
    // Unable to add these in the test file
    i18next.addResource("en", "test", "thing", "Thing");
    i18next.addResource("nl", "test", "thing", "Ding");
  });
