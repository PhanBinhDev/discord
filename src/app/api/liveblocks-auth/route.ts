// import { DEFAULT_NAME_TEAMMATE } from '@/constants/app';
// import { api } from '@/convex/_generated/api';
// import { ensureEnvironmentVariable } from '@/convex/http';
// import { auth, currentUser } from '@clerk/nextjs/server';
// import { Liveblocks } from '@liveblocks/node';
// import { ConvexHttpClient } from 'convex/browser';

// const secret = ensureEnvironmentVariable(
//   'NEXT_PUBLIC_LIVE_BLOCK_SECRET_API_KEY',
// );

// const url = ensureEnvironmentVariable('NEXT_PUBLIC_CONVEX_URL');

// const liveblocks = new Liveblocks({
//   secret,
// });

export async function POST() {
  //   const authorization = await auth();
  //   const user = await currentUser();
  //   const { room, shareId } = await request.json();

  //   if (!authorization || !user) {
  //     return new Response(
  //       JSON.stringify({
  //         error: 'Unauthorized',
  //         redirectUrl: `/?sign-in=true&redirect=${encodeURIComponent(`/board/${room}`)}`,
  //       }),
  //       {
  //         status: 401,
  //         headers: { 'Content-Type': 'application/json' },
  //       },
  //     );
  //   }

  //   const authToken = await authorization.getToken({
  //     template: 'convex',
  //   });

  //   const convex = new ConvexHttpClient(url, {
  //     auth: authToken!,
  //   });

  //   const board = await convex.query(api.boards.getDetails, { id: room });

  //   if (!board) {
  //     return new Response('Board not found', { status: 404 });
  //   }

  //   const isOrgMember = board.orgId === authorization.orgId;
  //   const isOwner = board.isOwner;
  //   const isBoardMember = !!board.userRole;

  //   let shareAccess = null;
  //   if (shareId && !isBoardMember && !isOwner) {
  //     shareAccess = await convex.query(api.boards.getShareLinkWithBoard, {
  //       shareId,
  //     });

  //     if (shareAccess && shareAccess.boardId === room) {
  //       await convex.mutation(api.boards.joinViaShareLink, { shareId });
  //     }
  //   }

  //   let canAccess = false;
  //   let accessLevel: string = 'viewer';

  //   if (isOwner) {
  //     canAccess = true;
  //     accessLevel = 'owner';
  //   } else if (isBoardMember && board.userRole) {
  //     canAccess = true;
  //     accessLevel = board.userRole;
  //   } else if (board.visibility === 'public') {
  //     canAccess = true;
  //     accessLevel = shareAccess?.role || 'viewer';
  //   } else if (board.visibility === 'organization') {
  //     canAccess = isOrgMember || !!shareAccess;
  //     accessLevel = shareAccess?.role || 'viewer';
  //   } else if (board.visibility === 'private') {
  //     canAccess = !!shareAccess;
  //     accessLevel = shareAccess?.role || 'viewer';
  //   }

  //   if (!canAccess) {
  //     return new Response('Unauthorized', { status: 403 });
  //   }

  //   const userInfo = {
  //     name: user.firstName || DEFAULT_NAME_TEAMMATE,
  //     picture: user.imageUrl,
  //   };

  //   const session = liveblocks.prepareSession(user.id, { userInfo });

  //   console.log(
  //     `Access level for user ${user.id} on board ${room}: ${accessLevel}`,
  //   );

  //   if (room) {
  //     if (accessLevel === 'owner' || accessLevel === 'editor') {
  //       session.allow(room, session.FULL_ACCESS);
  //     } else if (accessLevel === 'commenter') {
  //       session.allow(room, [
  //         'room:read',
  //         'room:presence:write',
  //         'comments:write',
  //         'comments:read',
  //       ]);
  //     } else {
  //       session.allow(room, [
  //         'room:read',
  //         'room:presence:write',
  //         'comments:read',
  //       ]);
  //     }
  //   }

  //   const { status, body } = await session.authorize();
  return new Response('Not implemented', { status: 501 });
}
