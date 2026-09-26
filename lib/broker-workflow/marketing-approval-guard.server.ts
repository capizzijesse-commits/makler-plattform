import "server-only";

import {
  prisma,
} from "@/lib/prisma";


export const BROKER_MARKETING_APPROVAL_REQUIRED =
  "BROKER_MARKETING_APPROVAL_REQUIRED";


function hasGeneratedListingText(
  generatedText:
    string | null,
  generatedVariants:
    string | null
) {
  return Boolean(
    generatedText?.trim() ||
      generatedVariants?.trim()
  );
}


export async function isBrokerMarketingApproved(
  input: {
    userId:
      string;

    listingId:
      string;
  }
):
  Promise<boolean> {

  const userId =
    input.userId.trim();

  const listingId =
    input.listingId.trim();


  if (
    !userId ||
    !listingId
  ) {
    return false;
  }


  const listing =
    await prisma.listing.findFirst({
      where: {
        id:
          listingId,

        userId,
      },

      select: {
        location:
          true,

        propertyType:
          true,

        livingArea:
          true,

        rooms:
          true,

        price:
          true,

        highlights:
          true,

        generatedText:
          true,

        generatedVariants:
          true,

        brokerWorkflow: {
          select: {
            marketingApprovedAt:
              true,
          },
        },

        _count: {
          select: {
            images:
              true,
          },
        },
      },
    });


  if (!listing) {
    return false;
  }


  const explicitlyApproved =
    Boolean(
      listing
        .brokerWorkflow
        ?.marketingApprovedAt
    );


  if (explicitlyApproved) {
    return true;
  }


  /*
   * DIRECT PUBLICATION V1
   *
   * Der Automationsweg darf direkt in die
   * Veröffentlichung wechseln, sobald das
   * echte Objektpaket vollständig ist.
   *
   * Bewertung, Auftrag und CRM-Freigabe
   * werden dabei weder vorausgesetzt noch
   * künstlich als erledigt gespeichert.
   */
  const directPublicationReady =
    Boolean(
      listing.location?.trim()
    ) &&
    Boolean(
      listing.propertyType?.trim()
    ) &&
    typeof listing.livingArea ===
      "number" &&
    listing.livingArea >
      0 &&
    typeof listing.rooms ===
      "number" &&
    listing.rooms >
      0 &&
    typeof listing.price ===
      "number" &&
    listing.price >
      0 &&
    listing.highlights.length >
      0 &&
    hasGeneratedListingText(
      listing.generatedText,
      listing.generatedVariants
    ) &&
    listing._count.images >
      0;


  return directPublicationReady;
}
