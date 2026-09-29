export interface DocumentBase {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  collectionId: string;
  updatedAt: string;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string; // Markdown or plain text
}

export interface Document extends DocumentBase {
  description: string;
  sections: DocumentSection[];
  relatedKnowledgeIds: string[];
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string;
}

export interface SearchResult extends DocumentBase {
  collectionName: string;
  snippet: string;
}
