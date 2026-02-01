import type { MobileBackButtonProps } from "@/platform/components/Messages/MobileBackButton"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from "../registry/types"

const mobileBackButtonMeta: GalleryComponentMeta = {
  id: "messages/mobile-back-button",
  sourceId: "@/platform/components/Messages/MobileBackButton#MobileBackButton",
  status: "prod",
}

export const mobileBackButtonGalleryEntry: GalleryEntry<MobileBackButtonProps> = {
  id: mobileBackButtonMeta.id,
  name: "MobileBackButton",
  importPath: mobileBackButtonMeta.sourceId.split("#")[0],
  category: "Communication",
  layoutSize: "small",
  meta: mobileBackButtonMeta,
  variants: [
    {
      name: "Default",
      description: "Back button for mobile message views.",
      props: {
        onClick: () => {
          console.log("Back clicked")
        },
        label: "Back",
        className: "",
      },
      status: "prod",
      category: "state",
    },
    {
      name: "Custom Label",
      description: "Back button with a custom label.",
      props: {
        onClick: () => {
          console.log("Close clicked")
        },
        label: "Close chat",
        className: "",
      },
      status: "prod",
      category: "variant",
    },
  ],
}


