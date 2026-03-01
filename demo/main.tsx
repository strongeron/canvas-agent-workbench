import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CopilotKit } from "@copilotkit/react-core"
import App from './App'
import './index.css'
import "@copilotkit/react-ui/styles.css"
import { installPaperMcpBridge } from './paperMcpBridge'

installPaperMcpBridge()
const copilotDevUiEnabled = import.meta.env.VITE_COPILOTKIT_DEV_UI === "1"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      showDevConsole={copilotDevUiEnabled}
      enableInspector={copilotDevUiEnabled}
    >
      <App />
    </CopilotKit>
  </StrictMode>,
)
