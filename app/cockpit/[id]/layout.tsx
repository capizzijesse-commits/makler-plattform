import type {
  ReactNode,
} from "react";

import DirectPublicationDock from "./DirectPublicationDock";


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
      <DirectPublicationDock
        listingId={id}
      />

      {children}
    </>
  );
}
