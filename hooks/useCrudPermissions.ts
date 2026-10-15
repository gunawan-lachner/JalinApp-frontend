"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

// Hook to automatically disable CRUD buttons based on permissions
export function useCrudPermissions() {
  const { canCrud } = useAuth()

  useEffect(() => {
    if (typeof window === "undefined") return

    const disableCrudButtons = () => {
      // Find all buttons with CRUD-related text
      const buttons = document.querySelectorAll('button, [role="button"]')

      buttons.forEach((button) => {
        const buttonText = button.textContent?.toLowerCase() || ""
        const buttonTitle = button.getAttribute("title")?.toLowerCase() || ""
        const buttonAriaLabel = button.getAttribute("aria-label")?.toLowerCase() || ""

        // Check if button contains CRUD-related words
        const crudKeywords = [
          "add",
          "new",
          "create",
          "update",
          "edit",
          "delete",
          "remove",
          "duplicate",
          "save",
          "change",
        ]
        const hasCrudKeyword = crudKeywords.some(
          (keyword) =>
            buttonText.includes(keyword) || buttonTitle.includes(keyword) || buttonAriaLabel.includes(keyword),
        )

        if (hasCrudKeyword && !canCrud) {
          // Disable the button
          button.setAttribute("disabled", "true")
          button.setAttribute("data-crud-disabled", "true")

          // Add visual styling for disabled state
          if (button instanceof HTMLElement) {
            button.style.opacity = "0.5"
            button.style.cursor = "not-allowed"
            button.style.pointerEvents = "none"
          }
        } else if (hasCrudKeyword && canCrud) {
          // Re-enable the button if permissions allow
          const wasCrudDisabled = button.getAttribute("data-crud-disabled") === "true"
          if (wasCrudDisabled) {
            button.removeAttribute("disabled")
            button.removeAttribute("data-crud-disabled")

            if (button instanceof HTMLElement) {
              button.style.opacity = ""
              button.style.cursor = ""
              button.style.pointerEvents = ""
            }
          }
        }
      })
    }

    // Initial check
    disableCrudButtons()

    // Set up mutation observer to watch for dynamically added buttons
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false

      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              // Check if the added node is a button or contains buttons
              if (
                element.tagName === "BUTTON" ||
                element.getAttribute("role") === "button" ||
                element.querySelector('button, [role="button"]')
              ) {
                shouldCheck = true
              }
            }
          })
        }
      })

      if (shouldCheck) {
        // Delay to ensure DOM is fully updated
        setTimeout(disableCrudButtons, 100)
      }
    })

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Cleanup
    return () => {
      observer.disconnect()
    }
  }, [canCrud])

  return { canCrud }
}
