import { useState } from 'react';
import { messagingApi } from '../../../api/messaging';
import { generateShareText } from '../utils/generateShareText';
import { useRouter } from '../../../router';


export function useShareRoom(filters?: any, amenityOptions?: any[], propertyTypeOptions?: any[]) {
  const { navigate } = useRouter();
  const [selectedShareRoom, setSelectedShareRoom] = useState<any | null>(null);
  const [shareOptions, setShareOptions] = useState<Record<string, boolean>>({});

  const handleSetSelectedShareRoom = (room: any) => {
    setSelectedShareRoom(room);
    if (room) {
      const initial: Record<string, boolean> = {
        basicDetails: true,
        basicDetails_roomName: true,
        basicDetails_roomType: true,
        basicDetails_occupancy: true,
        basicDetails_amenities: true,
        price: true,
        price_amount: true,
        images_room: true,
        images_property: true,
      };
      
      (room.room_images || []).forEach((_: any, i: number) => {
        initial[`images_room_${i}`] = true;
      });
      const propImages = room.property_images || room.property?.images || [];
      propImages.forEach((_: any, i: number) => {
        initial[`images_property_${i}`] = true;
      });
      
      setShareOptions(initial);
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
      const res = await messagingApi.listConversations();
      setShareConversations(res.data);
    } catch(err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  const handleSendShare = async () => {
    setIsSendingShare(true);
    try {
      const textOptions = { ...shareOptions };
      const text = generateShareText(selectedShareRoom, textOptions, filters, amenityOptions, propertyTypeOptions);
      
      const imagesToInclude: any[] = [];
      if (shareOptions.images_room && selectedShareRoom.room_images) {
        imagesToInclude.push(...selectedShareRoom.room_images.filter((_: any, i: number) => shareOptions[`images_room_${i}`]));
      }
      if (shareOptions.images_property) {
        const propImages = selectedShareRoom.property_images || selectedShareRoom.property?.images || [];
        imagesToInclude.push(...propImages.filter((_: any, i: number) => shareOptions[`images_property_${i}`]));
      }

      for (const chatId of selectedChats) {
        const textRes = await messagingApi.sendMessage(chatId, { 
          body: text, 
          msg_type: 'text', 
          related_room_uuid: selectedShareRoom.uuid 
        });
        // Import messagingStore at the top of the file to do this
        import('../../../store/messagingStore').then(({ messagingStore }) => {
            messagingStore.pushMessage(chatId, textRes.data);
            messagingStore.updateConversationMeta(chatId, {
              last_message: { body: textRes.data.body, direction: 'outbound', msg_type: 'text', media_url: '', related_room_uuid: selectedShareRoom.uuid },
              last_message_at: textRes.data.timestamp
            });
        });

        for (const img of imagesToInclude) {
          const url = img.url || img.image;
          if (url) {
            const imgRes = await messagingApi.sendMessage(chatId, { 
              body: '', 
              msg_type: 'image', 
              media_url: url,
              related_room_uuid: selectedShareRoom.uuid
            });
            import('../../../store/messagingStore').then(({ messagingStore }) => {
                messagingStore.pushMessage(chatId, imgRes.data);
                messagingStore.updateConversationMeta(chatId, {
                  last_message: { body: '', direction: 'outbound', msg_type: 'image', media_url: url, related_room_uuid: selectedShareRoom.uuid },
                  last_message_at: imgRes.data.timestamp
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
    closeShare
  };
}
