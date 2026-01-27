interface ChannelIdPageProps {
  params: Promise<{
    channelId: string;
    serverId: string;
  }>;
}

const ChannelIdPage = async ({}: ChannelIdPageProps) => {
  // const { channelId, serverId } = await params;

  // const channel = await fetchQuery(
  //   api.channels.getChannelById,
  //   {
  //     serverId,
  //     channelId,
  //   },
  //   {
  //     token,
  //   },
  // );

  return <>ChannelID</>;
};

export default ChannelIdPage;
