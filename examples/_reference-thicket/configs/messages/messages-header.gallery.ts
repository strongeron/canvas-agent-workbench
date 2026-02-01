import type { MessagesHeaderProps } from "@/platform/components/Messages/MessagesHeader"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from "../registry/types"

const messagesHeaderMeta: GalleryComponentMeta = {
  id: "messages/messages-header",
  sourceId: "@/platform/components/Messages/MessagesHeader#MessagesHeader",
  status: "prod",
}

export const messagesHeaderGalleryEntry: GalleryEntry<MessagesHeaderProps> = {
  id: messagesHeaderMeta.id,
  name: "MessagesHeader",
  importPath: messagesHeaderMeta.sourceId.split("#")[0],
  category: "Communication",
  layoutSize: "medium",
  meta: messagesHeaderMeta,
  variants: [
    {
      name: "Default (3 Unread)",
      description: "Messages header with a few unread messages and enabled compose button.",
      props: {
        unreadCount: 3,
        onNewMessage: () => {
          console.log("New message clicked")
        },
        disabled: false,
        title: "Messages",
      },
      status: "prod",
      category: "state",
    },
    {
      name: "All Caught Up",
      description: "No unread messages, shows an all-caught-up message.",
      props: {
        unreadCount: 0,
        onNewMessage: () => {
          console.log("New message clicked")
        },
        disabled: false,
        title: "Messages",
      },
      status: "prod",
      category: "state",
    },
    {
      name: "Disabled",
      description: "Header with compose button disabled (e.g. lack of permissions).",
      props: {
        unreadCount: 5,
        onNewMessage: () => {
          console.log("New message clicked")
        },
        disabled: true,
        title: "Messages",
      },
      status: "prod",
      category: "state",
    },
  ],
}


