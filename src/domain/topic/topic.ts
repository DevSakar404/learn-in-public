export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: Date;
}

/** The slice of a topic embedded in a note. */
export type TopicRef = Pick<Topic, "id" | "name" | "slug">;
