import { getAuthToken } from '@/actions/auth';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';

interface ServerPageProps {
  params: Promise<{
    serverId: Id<'servers'>;
  }>;
}

const ServerPage = async ({ params }: ServerPageProps) => {
  const { serverId } = await params;
  const token = await getAuthToken();

  const server = await fetchQuery(
    api.servers.getServerById,
    {
      serverId,
    },
    {
      token,
    },
  );

  const channels = await fetchQuery(
    api.servers.getAccessibleChannels,
    {
      serverId,
    },
    {
      token,
    },
  );

  if (!server) redirect('/');

  return redirect(
    `/servers/${serverId}/channels/${channels?.defaultChannelId}`
  );
};

export default ServerPage;
