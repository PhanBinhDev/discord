import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { DictKey } from '@/internationalization/get-dictionaries';
import { cn } from '@/lib/utils';
import { ChannelWithCategory, IntegrationStep } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import { IconRobot, IconWebhook } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import moment from 'moment';
import { memo, useState } from 'react';
import { toast } from 'sonner';
interface IntegrationChannelProps {
  channel: ChannelWithCategory;
}

const IntegrationChannel = memo(({ channel }: IntegrationChannelProps) => {
  const { dict } = useClientDictionary();

  const [step, setStep] = useState<IntegrationStep>({
    id: 'webhooks',
    step: 1,
  });
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(
    null,
  );

  const { data: webhooks, isLoading: isLoadingWebhooks } = useQuery({
    ...convexQuery(api.servers.getWebhooksByChannelId, {
      channelId: channel._id,
    }),
    enabled: !!channel,
  });

  const { mutate: createWebhook, pending: isCreatingWebhook } = useApiMutation(
    api.servers.createWebhook,
  );

  const handleCreateWebhook = () => {
    createWebhook({
      channelId: channel._id,
      name: 'New Webhook',
    })
      .then(() => {
        toast.success(
          dict?.servers.channel.edit.integrate.createWebhookSuccess,
        );
      })
      .catch(() => {
        toast.error(dict?.servers.channel.edit.integrate.createWebhookError);
      });
  };

  return (
    <TabsContent value="integrations" className="space-y-4">
      <div>
        <div className="flex gap-1">
          <h3
            className={cn(
              'text-lg font-semibold mb-2',
              step.step === 2 && 'cursor-pointer',
            )}
            onClick={() => {
              if (step.step === 2) setStep({ id: 'webhooks', step: 1 });
            }}
          >
            <TranslateText value="servers.channel.edit.integrate.title" />
          </h3>
          {step.step === 2 && (
            <>
              <ChevronRight className="size-5 text-muted-foreground mt-1" />
              <h3 className="text-lg font-semibold mb-2">
                <TranslateText
                  value={`servers.channel.edit.integrate.${step.id}`}
                />
              </h3>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          <TranslateText
            value={
              `servers.channel.edit.integrate.${step.step === 1 ? 'description' : `${step.id}Description`}` as DictKey
            }
          />
        </p>
      </div>
      {step.step === 1 ? (
        <div className="space-y-3">
          <Item
            variant={'outline'}
            onClick={() => {
              setStep({ id: 'webhooks', step: 2 });
            }}
            className="rounded-md border-muted-foreground/10 hover:bg-muted-foreground/5 cursor-pointer"
          >
            <ItemMedia className="self-center! mb-1">
              <IconWebhook size={26} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                <TranslateText value="servers.channel.edit.integrate.webhooks" />
              </ItemTitle>
              <ItemDescription>
                {isLoadingWebhooks ? (
                  <TranslateText value="common.loading" />
                ) : (
                  `${webhooks?.length ?? 0} webhook${webhooks && webhooks.length > 0 ? 's' : ''}`
                )}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight className="size-5 text-muted-foreground" />
            </ItemActions>
          </Item>
          <Item
            variant={'outline'}
            className="rounded-md border-muted-foreground/10 opacity-60 cursor-not-allowed"
          >
            <ItemMedia className="self-center! mb-1">
              <IconRobot size={26} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                <TranslateText value="servers.channel.edit.integrate.bots" />
              </ItemTitle>
              <ItemDescription>
                <TranslateText value="common.comingSoon" />
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight className="size-5 text-muted-foreground" />
            </ItemActions>
          </Item>
        </div>
      ) : (
        <div className="space-y-3">
          {step.id === 'webhooks' && (
            <div className="space-y-4">
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateWebhook}
                loading={isCreatingWebhook}
                disabled={isCreatingWebhook}
              >
                <TranslateText value="servers.channel.edit.integrate.createWebhook" />
              </Button>

              <div>
                <h4 className="text-sm font-semibold mb-3 uppercase text-muted-foreground">
                  <TranslateText value="servers.channel.edit.integrate.postsTo" />{' '}
                  #{channel.name}
                </h4>

                {isLoadingWebhooks ? (
                  <div className="text-sm text-muted-foreground">
                    <TranslateText value="common.loading" />
                  </div>
                ) : webhooks && webhooks.length > 0 ? (
                  <div className="space-y-3">
                    {webhooks.map(webhook => (
                      <Collapsible
                        key={webhook._id}
                        open={expandedWebhookId === webhook._id}
                        onOpenChange={open =>
                          setExpandedWebhookId(open ? webhook._id : null)
                        }
                      >
                        <Item
                          variant="outline"
                          className="rounded-lg border-muted-foreground/10 bg-muted/30"
                        >
                          <ItemMedia className="self-start pt-1">
                            <UserAvatar
                              src={webhook.avatarUrl}
                              name={webhook.name}
                              size={10}
                            />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle className="font-semibold">
                              {webhook.name}
                            </ItemTitle>
                            <ItemDescription className="text-xs">
                              <TranslateText value="servers.channel.edit.integrate.createdOn" />{' '}
                              {moment(webhook._creationTime).format('LL')}{' '}
                              <TranslateText value="servers.channel.edit.integrate.by" />{' '}
                              {webhook.creator?.displayName ||
                                webhook.creator?.username}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronRight
                                  className={cn(
                                    'size-5 text-muted-foreground transition-transform',
                                    expandedWebhookId === webhook._id &&
                                      'rotate-90',
                                  )}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          </ItemActions>
                        </Item>

                        <CollapsibleContent className="mt-2">
                          <div className="rounded-lg border border-muted-foreground/10 bg-muted/30 p-4 space-y-4">
                            <div className="flex gap-4">
                              <div className="shrink-0">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="size-20 rounded-lg"
                                >
                                  <UserAvatar
                                    src={webhook.avatarUrl}
                                    name={webhook.name}
                                    size={16}
                                  />
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                  <TranslateText value="servers.channel.edit.integrate.minSize" />
                                  : 128x128
                                </p>
                              </div>

                              <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                  <Label>
                                    <TranslateText value="servers.channel.edit.integrate.webhookName" />
                                  </Label>
                                  <Input
                                    defaultValue={webhook.name}
                                    placeholder="Captain Hook"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>
                                    <TranslateText value="servers.channel.edit.integrate.channel" />
                                  </Label>
                                  <Select defaultValue={channel._id}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={channel._id}>
                                        #{channel.name}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <Separator className="bg-muted-foreground/10" />

                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                className="hover:bg-muted-foreground/10 rounded-md"
                                size="sm"
                              >
                                <TranslateText value="servers.channel.edit.integrate.copyWebhookUrl" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="ml-auto"
                              >
                                <TranslateText value="servers.channel.edit.integrate.deleteWebhook" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <TranslateText value="servers.channel.edit.integrate.noWebhooks" />
                  </div>
                )}
              </div>
            </div>
          )}
          {step.id === 'bots' && <></>}
        </div>
      )}
    </TabsContent>
  );
});

IntegrationChannel.displayName = 'IntegrationChannel';

export default IntegrationChannel;
