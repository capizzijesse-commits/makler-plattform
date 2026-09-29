import "server-only";

import {
  prisma,
} from "@/lib/prisma";


export type PreparedPublicationTarget = {
  targetKey: string;

  kind:
    | "portal"
    | "social";

  provider:
    string |
    null;

  destination:
    string;

  connectionId:
    string |
    null;

  externalAccountId:
    string |
    null;

  environment:
    string |
    null;

  status:
    "pending";
};


export type CreatePreparedPublicationRunInput = {
  userId: string;

  listingId: string;

  targets:
    PreparedPublicationTarget[];
};


export async function createPreparedPublicationRun(
  input:
    CreatePreparedPublicationRunInput
) {

  if (!input.userId.trim()) {
    throw new Error(
      "PUBLICATION_USER_ID_REQUIRED"
    );
  }


  if (!input.listingId.trim()) {
    throw new Error(
      "PUBLICATION_LISTING_ID_REQUIRED"
    );
  }


  const unique =
    new Map<
      string,
      PreparedPublicationTarget
    >();


  for (
    const target
    of input.targets
  ) {

    if (!target.targetKey.trim()) {
      continue;
    }

    unique.set(
      target.targetKey,
      target
    );
  }


  const targets =
    Array.from(
      unique.values()
    );


  if (
    targets.length ===
    0
  ) {
    throw new Error(
      "PUBLICATION_TARGETS_REQUIRED"
    );
  }


  return prisma.publicationRun.create({
    data: {
      userId:
        input.userId,

      listingId:
        input.listingId,

      status:
        "ready",

      targets: {
        create:
          targets,
      },
    },

    include: {
      targets: {
        orderBy: {
          createdAt:
            "asc",
        },
      },
    },
  });
}