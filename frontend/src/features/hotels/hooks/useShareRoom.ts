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
    const initialSendProp = cfg.initial_send_property_images ?? true;
    const initialSendVideo = cfg.initial_send_videos ?? false;
    const roomLimit = cfg.initial_room_image_limit ?? 1;
    const propLimit = cfg.initial_property_image_limit ?? 1;
    const videoLimit = cfg.initial_video_limit ?? 1;

    const initial: Record<string, boolean> = {
      basicDetails: true,
      basicDetails_roomName: true,
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
    if (selectedChats.length === 0 || !selectedShareRoom) return;
    setIsSendingShare(true);
    try {
      const rooms = Array.isArray(selectedShareRoom) ? selectedShareRoom : [selectedShareRoom];
      const availableUuids = (availableRooms || []).map((r: any) => r.uuid).filter(Boolean);

      await messagingApi.sendInitialShare({
        conversation_ids: selectedChats,
        rooms,
        filters: filters || {},
        share_options: shareOptions,
        use_interactive: useInteractiveButtons,
        available_room_uuids: availableUuids,
      });

      // If we shared to at least one chat, make the first one active so Inbox opens it
      if (selectedChats.length > 0) {
        import('../../../store/messagingStore').then(({ messagingStore }) => {
          messagingStore.setActiveConversation(selectedChats[0]);
        });
      }

      closeShare();
      navigate('/messaging');
    } catch (err) {
      console.error("Failed to send initial share", err);
      alert('Failed to send share. Please check your connection and try again.');
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

