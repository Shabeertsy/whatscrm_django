import { useState, useEffect } from 'react';
import { messagingApi } from '../../../api/messaging';
import { generateShareText } from '../utils/generateShareText';
import { useRouter } from '../../../router';
import { PropertyShareConfig, DEFAULT_PROPERTY_SHARE_CONFIG } from '../../settings/types/shareSettings';


export function useShareRoom(
  filters?: any,
  amenityOptions?: any[],
  propertyTypeOptions?: any[],
  availableRooms?: any[]
) {


  const { navigate } = useRouter();
  // selectedShareRoom can be a single room or an array of rooms (for multi-select)
  const [selectedShareRoom, setSelectedShareRoom] = useState<any | null>(null);
  const [shareOptions, setShareOptions] = useState<Record<string, boolean>>({});

  // Button customization state (pre-filled from Settings)
  const [buttonConfig, setButtonConfig] = useState<PropertyShareConfig>(DEFAULT_PROPERTY_SHARE_CONFIG);
  const [useInteractiveButtons, setUseInteractiveButtons] = useState(true);

  useEffect(() => {
    messagingApi.getPropertyShareConfig()
      .then(res => {
        if (res.data) setButtonConfig({ ...DEFAULT_PROPERTY_SHARE_CONFIG, ...res.data });
      })
      .catch(err => console.error("Could not load property share config", err));
  }, []);

  const buildInitialOptions = (room: any, cfg: PropertyShareConfig = buttonConfig): Record<string, boolean> => {
    const initialSendRoom = cfg.initial_send_room_images ?? true;
    const initialSendProp = cfg.initial_send_property_images ?? false;
    const initialSendVideo = cfg.initial_send_videos ?? false;
    const roomLimit = cfg.initial_room_image_limit ?? 4;
    const propLimit = cfg.initial_property_image_limit ?? 2;
    const videoLimit = cfg.initial_video_limit ?? 1;

    const initial: Record<string, boolean> = {
      basicDetails: true,
      basicDetails_roomName: false,
      basicDetails_roomType: true,
      basicDetails_occupancy: true,
      basicDetails_amenities: true,
      price: true,
      price_amount: true,
      images_room: initialSendRoom,
      images_property: initialSendProp,
      videos_property: initialSendVideo,
    };
    (room.room_images || []).forEach((_: any, i: number) => {
      initial[`images_room_${i}`] = initialSendRoom && (i < roomLimit);
    });
    const propImages = room.property_details?.property_images || room.property_images || room.property?.images || [];
    propImages.forEach((_: any, i: number) => {
      initial[`images_property_${i}`] = initialSendProp && (i < propLimit);
    });
    const propVideos = room.property_details?.property_videos || room.property_videos || room.property?.videos || [];
    propVideos.forEach((_: any, i: number) => {
      initial[`videos_property_${i}`] = initialSendVideo && (i < videoLimit);
    });
    return initial;
  };

  const handleSetSelectedShareRoom = (room: any) => {
    setSelectedShareRoom(room);
    if (room) {
      // For multi-room arrays, base options on the first room
      const baseRoom = Array.isArray(room) ? room[0] : room;
      setShareOptions(buildInitialOptions(baseRoom));
    } else {
      setShareOptions({});
    }
  };

  const [expandedShareCategory, setExpandedShareCategory] = useState<string | null>(null);
  const [shareStep, setShareStep] = useState<'options' | 'select_chats'>('options');
  const [shareConversations, setShareConversations] = useState<any[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");

  const filteredConversations = shareConversations.filter(c => {
    if (!chatSearchTerm) return true;
    const s = chatSearchTerm.toLowerCase();
    return (c.contact.name || '').toLowerCase().includes(s) || (c.contact.phone || '').toLowerCase().includes(s);
  });

  const loadConversations = async () => {
    setShareStep('select_chats');
    try {
      const res = await messagingApi.listConversations({ limit: 100, offset: 0 });
      setShareConversations(res.data.results);
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  const handleSendShare = async () => {
    setIsSendingShare(true);
    try {
      const rooms = Array.isArray(selectedShareRoom) ? selectedShareRoom : [selectedShareRoom];

      for (const chatId of selectedChats) {
        for (let idx = 0; idx < rooms.length; idx++) {
          const room = rooms[idx];
          const textOptions = { ...shareOptions };
          const text = generateShareText(room, textOptions, filters, amenityOptions, propertyTypeOptions);

          const mediaToInclude: any[] = [];
          if (shareOptions.images_property) {
            const propImages = room.property_details?.property_images || room.property_images || room.property?.images || [];
            mediaToInclude.push(...propImages.filter((_: any, i: number) => shareOptions[`images_property_${i}`]).map((img: any) => ({ ...img, msg_type: 'image' })));
          }
          if (shareOptions.images_room && room.room_images) {
            mediaToInclude.push(...room.room_images.filter((_: any, i: number) => shareOptions[`images_room_${i}`]).map((img: any) => ({ ...img, msg_type: 'image' })));
          }
          if (shareOptions.videos_property) {
            const propVideos = room.property_details?.property_videos || room.property_videos || room.property?.videos || [];
            mediaToInclude.push(...propVideos.filter((_: any, i: number) => shareOptions[`videos_property_${i}`]).map((vid: any) => ({ ...vid, msg_type: 'video' })));
          }

          // If interactive buttons are enabled, prepare the buttons
          let interactiveOpts: { id: string; label: string; action_type: string }[] = [];
          let remainingQueueUuids: string[] = [];
          let candidateNextRooms: any[] = [];
          const heroUrl = (room.room_images && room.room_images[0])
            ? (room.room_images[0].url || room.room_images[0].image || '')
            : '';

          if (useInteractiveButtons) {
            if (buttonConfig.book_button_enabled) {
              interactiveOpts.push({
                id: `share_book:${room.uuid}`,
                label: buttonConfig.book_button_label.slice(0, 20),
                action_type: 'book',
              });
            }
            if (buttonConfig.details_button_enabled) {
              interactiveOpts.push({
                id: `share_details:${room.uuid}`,
                label: buttonConfig.details_button_label.slice(0, 20),
                action_type: 'more_details',
              });
            }
            // Candidate next rooms:
            // 1. If multiple rooms were selected to share, take subsequent selected rooms.
            // 2. If a single room was shared, take all other rooms from the filtered search.
            candidateNextRooms = (rooms.length > 1 && idx < rooms.length - 1)
              ? rooms.slice(idx + 1)
              : (availableRooms || []).filter((r: any) => r.uuid !== room.uuid);

            const nextRoom = candidateNextRooms.length > 0 ? candidateNextRooms[0] : null;
            remainingQueueUuids = candidateNextRooms.map((r: any) => r.uuid);

            if (nextRoom && buttonConfig.next_button_enabled && interactiveOpts.length < 3) {
              interactiveOpts.push({
                id: `share_next:${room.uuid}:${nextRoom.uuid}`,
                label: buttonConfig.next_button_label.slice(0, 20),
                action_type: 'next',
              });
            } else if (buttonConfig.exit_button_enabled && interactiveOpts.length < 3) {
              interactiveOpts.push({
                id: `share_exit:${room.uuid}`,
                label: buttonConfig.exit_button_label.slice(0, 20),
                action_type: 'exit',
              });
            }
          }

          // Avoid duplicating hero image as an extra attachment if heroUrl is already sent on the card header
          const heroClean = (heroUrl || '').split('?')[0].toLowerCase();
          const seenMediaKeys = new Set<string>();
          if (useInteractiveButtons && heroClean) {
            seenMediaKeys.add(heroClean);
          }

          const filteredMedia = mediaToInclude.filter((m: any) => {
            const rawUrl = (m.url || m.image || m.video || '').trim();
            if (!rawUrl) return false;
            const cleanUrl = rawUrl.split('?')[0].toLowerCase();
            if (seenMediaKeys.has(cleanUrl)) return false;
            seenMediaKeys.add(cleanUrl);
            return true;
          });

          // First send extra media attachments (property images first, room images second, videos third)
          for (const media of filteredMedia) {
            const url = media.url || media.image || media.video;
            if (url) {
              const msgType = media.msg_type || 'image';
              const mediaRes = await messagingApi.sendMessage(chatId, {
                body: '',
                msg_type: msgType,
                media_url: url,
                related_room_uuid: room.uuid
              });
              import('../../../store/messagingStore').then(({ messagingStore }) => {
                messagingStore.pushMessage(chatId, mediaRes.data);
                messagingStore.updateConversationMeta(chatId, {
                  last_message: { body: '', direction: 'outbound', msg_type: msgType, media_url: url, related_room_uuid: room.uuid },
                  last_message_at: mediaRes.data.timestamp
                });
              });
            }
          }

          // Then send either interactive card or standard text
          if (useInteractiveButtons && interactiveOpts.length > 0) {
            const roomsMap: Record<string, any> = { [room.uuid]: room };
            (candidateNextRooms || []).slice(0, 15).forEach((r: any) => {
              if (r && r.uuid) roomsMap[r.uuid] = r;
            });

            const interactiveRes = await messagingApi.sendMessage(chatId, {
              body: text.slice(0, 1024),
              msg_type: 'interactive',
              related_room_uuid: room.uuid,
              header_image_url: heroUrl,
              interactive_options: interactiveOpts.slice(0, 3),

              // Persist filters + selected data and filtered room queue
              share_context: {
                filters: filters || {},
                share_options: shareOptions,
                room_uuid: room.uuid,
                room_data: room,
                rooms_map: roomsMap,
                queue: remainingQueueUuids,
              },
            });

            import('../../../store/messagingStore').then(({ messagingStore }) => {
              messagingStore.pushMessage(chatId, interactiveRes.data);
              messagingStore.updateConversationMeta(chatId, {
                last_message: { body: interactiveRes.data.body, direction: 'outbound', msg_type: 'interactive', media_url: heroUrl, related_room_uuid: room.uuid },
                last_message_at: interactiveRes.data.timestamp
              });
            });
          } else {
            const textRes = await messagingApi.sendMessage(chatId, {
              body: text,
              msg_type: 'text',
              related_room_uuid: room.uuid
            });

            import('../../../store/messagingStore').then(({ messagingStore }) => {
              messagingStore.pushMessage(chatId, textRes.data);
              messagingStore.updateConversationMeta(chatId, {
                last_message: { body: textRes.data.body, direction: 'outbound', msg_type: 'text', media_url: '', related_room_uuid: room.uuid },
                last_message_at: textRes.data.timestamp
              });
            });
          }
        }
      }

      // If we shared to at least one chat, make the first one active so Inbox opens it
      if (selectedChats.length > 0) {
        import('../../../store/messagingStore').then(({ messagingStore }) => {
          messagingStore.setActiveConversation(selectedChats[0]);
        });
      }

      closeShare();
      navigate('/messaging');
    } catch (err) {
      console.error("Failed to send", err);
      alert('Some messages failed to send. Please check your connection.');
    } finally {
      setIsSendingShare(false);
    }
  };

  const closeShare = () => {
    setSelectedShareRoom(null);
    setShareStep('options');
    setSelectedChats([]);
    setChatSearchTerm("");
  };

  return {
    selectedShareRoom, setSelectedShareRoom: handleSetSelectedShareRoom,
    shareOptions, setShareOptions,
    expandedShareCategory, setExpandedShareCategory,
    shareStep, setShareStep,
    shareConversations, setShareConversations,
    selectedChats, setSelectedChats,
    isSendingShare,
    chatSearchTerm, setChatSearchTerm,
    filteredConversations,
    loadConversations,
    handleSendShare,
    closeShare,
    buttonConfig, setButtonConfig,
    useInteractiveButtons, setUseInteractiveButtons,
  };
}

