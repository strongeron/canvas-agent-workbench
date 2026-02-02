import type { ReactNode } from "react"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import { LegalContentWrapper } from "@thicket/components/legal-content-wrapper"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const legalContentWrapperMeta: GalleryComponentMeta = {
  id: "landing.legal-content-wrapper",
  sourceId: "@thicket/components/legal-content-wrapper#LegalContentWrapper",
  status: "prod",
}

export const legalContentWrapperGalleryEntry: GalleryEntry<{ children: ReactNode }> = {
  name: "LegalContentWrapper",
  importPath: legalContentWrapperMeta.sourceId.split("#")[0],
  category: "Landing",
  id: legalContentWrapperMeta.id,
  layoutSize: "full",
  meta: legalContentWrapperMeta,
  variants: [
    {
      name: "Default",
      description: "Legal content wrapper with styled prose",
      props: {
        children:
          "Privacy Policy — We value your privacy. This sample copy demonstrates the typography and spacing within the legal wrapper. By using our services you agree to the terms outlined in this example text.",
      },
      status: "prod",
      category: "Default",
    },
  ],
}
