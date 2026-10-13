export interface PropertyShareConfig {
  id?: string;
  // Button Labels & Actions (Max 20 chars per Meta rule)
  book_button_enabled: boolean;
  book_button_label: string;
  book_action_type: 'flow' | 'agent' | 'link';
  book_flow_id: string;

  details_button_enabled: boolean;
  details_button_label: string;

  next_button_enabled: boolean;
  next_button_label: string;

  exit_button_enabled: boolean;
  exit_button_label: string;

  //"More Details" Images & Media Rules
  details_send_room_images: boolean;
  details_room_image_limit: number;
  details_send_property_images: boolean;
  details_property_image_limit: number;
  details_send_videos: boolean;
  details_video_limit: number;
  details_text_template: string;
  details_selected_fields: Record<string, boolean>;

  // Initial Share (Hotel Page - before Next or More Details)
  initial_send_room_images: boolean;
  initial_room_image_limit: number;
  initial_send_property_images: boolean;
  initial_property_image_limit: number;
  initial_send_videos: boolean;
  initial_video_limit: number;

  // "Next" Button Navigation & Media Rules
  next_include_hero_image: boolean;
  next_send_extra_album: boolean;
  next_album_limit: number;
  no_more_results_text: string;
  exit_message_text: string;
}



export const DEFAULT_PROPERTY_SHARE_CONFIG: PropertyShareConfig = {
  book_button_enabled: true,
  book_button_label: 'Book Now',
  book_action_type: 'agent',
  book_flow_id: '',

  details_button_enabled: true,
  details_button_label: 'More Details',

  next_button_enabled: true,
  next_button_label: 'Next',

  exit_button_enabled: false,
  exit_button_label: 'Exit',

  details_send_room_images: true,
  details_room_image_limit: 4,
  details_send_property_images: false,
  details_property_image_limit: 2,
  details_send_videos: false,
  details_video_limit: 1,
  details_text_template: '',

  initial_send_room_images: true,
  initial_room_image_limit: 1,
  initial_send_property_images: true,
  initial_property_image_limit: 1,
  initial_send_videos: false,
  initial_video_limit: 1,
  details_selected_fields: {
    basicDetails: true,
    basicDetails_roomName: true,
    basicDetails_roomType: true,
    basicDetails_occupancy: true,
    basicDetails_amenities: true,
    searchFilters: true,
    filters_dates: true,
    filters_guests: true,
    filters_rooms: true,
    propertyDetails: true,
    propertyDetails_name: true,
    propertyDetails_type: true,
    price: true,
    price_amount: true,
    price_meal_plans: true,
    location: true,
    location_name: true,
    location_city: true,
    location_state: true,
    contactDetails: false,
    contactDetails_phone: false,
  },

  next_include_hero_image: true,
  next_send_extra_album: false,
  next_album_limit: 2,
  no_more_results_text: "You have viewed all available options.",
  exit_message_text: "Thank you! Let us know if you need anything else.",
};
