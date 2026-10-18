import { Collection, Document } from "./types";

export const collections: Collection[] = [
  {
    id: "c1",
    slug: "engineering",
    name: "Engineering",
    description: "Technical standards, system architecture, and development guidelines."
  },
  {
    id: "c2",
    slug: "project",
    name: "Project",
    description: "Project-specific decisions, setups, and post-mortems."
  },
  {
    id: "c3",
    slug: "process",
    name: "Process",
    description: "Standard operating procedures and company workflows."
  },
  {
    id: "c4",
    slug: "general-knowledge",
    name: "General Knowledge",
    description: "Company policies, onboarding guides, and shared knowledge."
  }
];

export const documents: Document[] = [
  {
    id: "d1",
    slug: "sales-invoice-pricing-rule",
    title: "Sales Invoice Pricing Rule",
    excerpt: "Logic for applying pricing rules on sales invoices in ERPNext.",
    collectionId: "c1",
    updatedAt: "2023-10-25T10:00:00Z",
    description: "This document outlines the standard implementation for custom pricing rules when generating Sales Invoices. It details how discounts are applied sequentially based on customer group and item category.",
    sections: [
      {
        id: "problem",
        title: "Problem",
        content: "ERPNext's default pricing rule engine sometimes conflicts when an item belongs to multiple discount categories simultaneously, causing double discounts to be applied."
      },
      {
        id: "solution",
        title: "Solution",
        content: "Implement a custom hook on `before_save` of Sales Invoice. The script evaluates all applicable pricing rules, sorts them by priority (Customer specific > Item Group > General), applies the highest priority rule, and ignores the rest."
      },
      {
        id: "project",
        title: "Project",
        content: "Initially developed during the AlphaCorp implementation. Reused in BetaRetail."
      },
      {
        id: "implementation",
        title: "Implementation",
        content: "Code snippet located in `custom_sales_invoice.py`. Ensure to check `frappe.flags.ignore_pricing_rule` to prevent infinite loops."
      },
      {
        id: "rules",
        title: "Rules",
        content: "1. Never apply more than one discount per item.\n2. If a manual discount is entered, ignore all automated pricing rules.\n3. Log skipped rules for debugging."
      }
    ],
    relatedKnowledgeIds: ["d2", "d5"]
  },
  {
    id: "d2",
    slug: "customer-item-sales",
    title: "Customer Item Sales Report",
    excerpt: "Custom query report showing historical sales by item and customer.",
    collectionId: "c1",
    updatedAt: "2023-10-20T14:30:00Z",
    description: "Documentation for the Customer Item Sales custom report, heavily used for quarterly analytics.",
    sections: [
      {
        id: "problem",
        title: "Problem",
        content: "Standard ERPNext reports don't show profit margin broken down by specific item variants per customer over custom time periods."
      },
      {
        id: "solution",
        title: "Solution",
        content: "A custom SQL query report that joins `Sales Invoice`, `Sales Invoice Item`, and `Item` tables. Calculates margin on the fly."
      }
    ],
    relatedKnowledgeIds: ["d1"]
  },
  {
    id: "d3",
    slug: "delivery-note-flow",
    title: "Delivery Note Flow",
    excerpt: "Standard workflow from Sales Order to Delivery Note to Invoice.",
    collectionId: "c3",
    updatedAt: "2023-11-01T09:15:00Z",
    description: "The approved process for handling outbound shipments and recognizing revenue.",
    sections: [
      {
        id: "process",
        title: "Process Outline",
        content: "1. Warehouse confirms stock.\n2. Delivery Note created from Sales Order.\n3. QA inspection (if applicable).\n4. Submit Delivery Note.\n5. Accounts creates Sales Invoice."
      },
      {
        id: "edge-cases",
        title: "Edge Cases",
        content: "Partial deliveries require careful linking to ensure the remaining Sales Order balance is accurate."
      }
    ],
    relatedKnowledgeIds: []
  },
  {
    id: "d4",
    slug: "erpnext-api-guidelines",
    title: "ERPNext API Guidelines",
    excerpt: "Best practices for interacting with Frappe/ERPNext REST API.",
    collectionId: "c1",
    updatedAt: "2023-09-15T11:00:00Z",
    description: "Standard practices for our frontend apps consuming ERPNext data.",
    sections: [
      {
        id: "authentication",
        title: "Authentication",
        content: "Use token-based authentication (API Key and API Secret). Do not use password-based login for server-to-server communication."
      },
      {
        id: "rate-limiting",
        title: "Rate Limiting",
        content: "Respect Frappe's default rate limits. Implement exponential backoff in retry logic."
      }
    ],
    relatedKnowledgeIds: []
  },
  {
    id: "d5",
    slug: "permission-structure",
    title: "Permission Structure",
    excerpt: "Overview of Role Profiles and User Permissions.",
    collectionId: "c1",
    updatedAt: "2023-11-05T16:45:00Z",
    description: "How we structure role-based access control across standard implementations.",
    sections: [
      {
        id: "roles",
        title: "Standard Roles",
        content: "Define base roles (e.g., Sales User, Inventory Manager) and use Role Profiles to assign them in bulk."
      }
    ],
    relatedKnowledgeIds: []
  }
];

export const recentDocumentIds = ["d1", "d3", "d5"];
export const favoriteDocumentIds = ["d1", "d4"];

export function getDocumentBySlug(slug: string): Document | undefined {
  return documents.find(d => d.slug === slug);
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return collections.find(c => c.slug === slug);
}

export function getDocumentsByCollection(collectionId: string): Document[] {
  return documents.filter(d => d.collectionId === collectionId);
}

export function getRelatedDocuments(document: Document): Document[] {
  return documents.filter(d => document.relatedKnowledgeIds.includes(d.id));
}
