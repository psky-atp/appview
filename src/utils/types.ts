import {
  SocialPskyActorProfile,
  SocialPskyChatMessage,
  SocialPskyChatRoom,
} from "@atcute/client/lexicons";

export interface Message {
  uri: string;
  cid: string;
  did: string;
  msg: SocialPskyChatMessage.Record;
}

export interface Room {
  uri: string;
  cid: string;
  owner: string;
  room: SocialPskyChatRoom.Record;
}

export interface User {
  did: string;
  handle?: string;
  active?: boolean;
  profile?: SocialPskyActorProfile.Record;
}
