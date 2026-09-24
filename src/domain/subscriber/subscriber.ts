export type SubscriberStatus = "active" | "unsubscribed";

export interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  createdAt: Date;
}
