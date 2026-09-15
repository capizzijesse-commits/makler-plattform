import "server-only";

import {
  randomBytes,
} from "node:crypto";


const FLOW_TTL_MS =
  10 * 60 * 1000;


export type ImmoScout24DeOAuthFlow = {
  id:
    string;

  userId:
    string;

  requestToken:
    string;

  requestTokenSecret:
    string;

  expiresAt:
    number;
};


type FlowStore =
  Map<
    string,
    ImmoScout24DeOAuthFlow
  >;


const globalStore =
  globalThis as typeof globalThis & {
    __inseratAiImmoScout24DeOAuthFlows?:
      FlowStore;
  };


const store:
  FlowStore =
    globalStore
      .__inseratAiImmoScout24DeOAuthFlows ??
    new Map();


if (
  !globalStore
    .__inseratAiImmoScout24DeOAuthFlows
) {
  globalStore
    .__inseratAiImmoScout24DeOAuthFlows =
      store;
}


function clean(
  value: string,
  label: string
): string {

  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${label} is required.`
    );
  }

  return normalized;
}


function removeExpiredFlows():
  void {

  const now =
    Date.now();

  for (
    const [
      id,
      flow,
    ] of store
  ) {

    if (
      flow.expiresAt <=
      now
    ) {
      store.delete(
        id
      );
    }
  }
}


export function createImmoScout24DeOAuthFlow(
  input: {
    userId:
      string;

    requestToken:
      string;

    requestTokenSecret:
      string;
  }
): ImmoScout24DeOAuthFlow {

  removeExpiredFlows();

  const flow:
    ImmoScout24DeOAuthFlow = {

    id:
      randomBytes(
        32
      ).toString(
        "base64url"
      ),

    userId:
      clean(
        input.userId,
        "User ID"
      ),

    requestToken:
      clean(
        input.requestToken,
        "Request token"
      ),

    requestTokenSecret:
      clean(
        input.requestTokenSecret,
        "Request token secret"
      ),

    expiresAt:
      Date.now() +
      FLOW_TTL_MS,
  };

  store.set(
    flow.id,
    flow
  );

  return flow;
}


export function consumeImmoScout24DeOAuthFlow(
  input: {
    id:
      string;

    userId:
      string;

    requestToken:
      string;
  }
):
  ImmoScout24DeOAuthFlow
  | null {

  removeExpiredFlows();

  const id =
    input.id.trim();

  if (!id) {
    return null;
  }

  const flow =
    store.get(
      id
    );

  if (!flow) {
    return null;
  }

  /*
   * One-time flow:
   * nach dem ersten Callback-Versuch
   * wird der Eintrag immer entfernt.
   */
  store.delete(
    id
  );

  if (
    flow.userId !==
      input.userId.trim() ||
    flow.requestToken !==
      input.requestToken.trim() ||
    flow.expiresAt <=
      Date.now()
  ) {
    return null;
  }

  return flow;
}

const SANDBOX_ACCESS_TTL_MS =
  30 * 60 * 1000;


export type ImmoScout24DeSandboxAccess = {
  userId:
    string;

  accessToken:
    string;

  accessTokenSecret:
    string;

  expiresAt:
    number;
};


type SandboxAccessStore =
  Map<
    string,
    ImmoScout24DeSandboxAccess
  >;


const sandboxAccessGlobal =
  globalThis as typeof globalThis & {
    __inseratAiImmoScout24DeSandboxAccess?:
      SandboxAccessStore;
  };


const sandboxAccessStore:
  SandboxAccessStore =
    sandboxAccessGlobal
      .__inseratAiImmoScout24DeSandboxAccess ??
    new Map();


if (
  !sandboxAccessGlobal
    .__inseratAiImmoScout24DeSandboxAccess
) {
  sandboxAccessGlobal
    .__inseratAiImmoScout24DeSandboxAccess =
      sandboxAccessStore;
}


export function setImmoScout24DeSandboxAccess(
  input: {
    userId:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;
  }
): ImmoScout24DeSandboxAccess {

  const userId =
    clean(
      input.userId,
      "User ID"
    );

  const access:
    ImmoScout24DeSandboxAccess = {

    userId,

    accessToken:
      clean(
        input.accessToken,
        "Access token"
      ),

    accessTokenSecret:
      clean(
        input.accessTokenSecret,
        "Access token secret"
      ),

    expiresAt:
      Date.now() +
      SANDBOX_ACCESS_TTL_MS,
  };

  sandboxAccessStore.set(
    userId,
    access
  );

  return access;
}


export function getImmoScout24DeSandboxAccess(
  userIdValue: string
):
  ImmoScout24DeSandboxAccess
  | null {

  const userId =
    userIdValue.trim();

  if (!userId) {
    return null;
  }

  const access =
    sandboxAccessStore.get(
      userId
    );

  if (!access) {
    return null;
  }

  if (
    access.expiresAt <=
    Date.now()
  ) {
    sandboxAccessStore.delete(
      userId
    );

    return null;
  }

  return access;
}


export function clearImmoScout24DeSandboxAccess(
  userIdValue: string
):
  void {

  const userId =
    userIdValue.trim();

  if (!userId) {
    return;
  }

  sandboxAccessStore.delete(
    userId
  );
}