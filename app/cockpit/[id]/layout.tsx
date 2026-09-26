import type {
  ReactNode,
} from "react";

import DirectPublicationDockV2 from "./DirectPublicationDockV2";


type CockpitListingLayoutProps = {
  children:
    ReactNode;

  params:
    Promise<{
      id:
        string;
    }>;
};


export default async function CockpitListingLayout({
  children,
  params,
}: CockpitListingLayoutProps) {
  const {
    id,
  } =
    await params;

  return (
    <>
      <DirectPublicationDockV2
        listingId={id}
      />

      {children}
    </>
  );
}
