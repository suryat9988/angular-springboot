export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  inviteCode: string;
  partnerUid: string | null;
  coupleId: string | null;
  partnerDisplayName: string | null;
}

export interface PartnerMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  createdAt: Date;
}
