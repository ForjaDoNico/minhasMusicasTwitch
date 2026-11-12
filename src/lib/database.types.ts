
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_tokens": {
                  Row: {
                    "access_token": string,"expires_at": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token": string,"expires_at": string,"id": string
                  }
                  Update: {
                    "access_token"?: string,"expires_at"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bot_commands": {
                  Row: {
                    "action": Database["public"]['Enums']["bot_action"],"aliases": (string)[],"channel_id": string,"command": string,"cooldown_sec": number,"created_at": string,"description": string,"enabled": boolean,"id": string,"is_default": boolean,"last_used_at": string | null,"name": string,"response_template": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": Database["public"]['Enums']["bot_action"],"aliases"?: (string)[],"channel_id": string,"command": string,"cooldown_sec"?: number,"created_at"?: string,"description"?: string,"enabled"?: boolean,"id"?: string,"is_default"?: boolean,"last_used_at"?: string | null,"name": string,"response_template"?: string
                  }
                  Update: {
                    "action"?: Database["public"]['Enums']["bot_action"],"aliases"?: (string)[],"channel_id"?: string,"command"?: string,"cooldown_sec"?: number,"created_at"?: string,"description"?: string,"enabled"?: boolean,"id"?: string,"is_default"?: boolean,"last_used_at"?: string | null,"name"?: string,"response_template"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bot_commands_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    }
                  ]
                },"channel_secrets": {
                  Row: {
                    "channel_id": string,"eventsub_subscription_ids": (string)[],"streamelements_channel_id": string | null,"streamelements_jwt": string | null,"tip_webhook_token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel_id": string,"eventsub_subscription_ids"?: (string)[],"streamelements_channel_id"?: string | null,"streamelements_jwt"?: string | null,"tip_webhook_token"?: string
                  }
                  Update: {
                    "channel_id"?: string,"eventsub_subscription_ids"?: (string)[],"streamelements_channel_id"?: string | null,"streamelements_jwt"?: string | null,"tip_webhook_token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "channel_secrets_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: true
      referencedRelation: "channels"
      referencedColumns: ["id"]
    }
                  ]
                },"channels": {
                  Row: {
                    "avatar_url": string | null,"bot_enabled": boolean,"created_at": string,"current_session_id": string | null,"display_name": string,"id": string,"last_visited_at": string | null,"owner_id": string,"queue_open": boolean,"queue_version": number,"settings": NonNullable<Json>,"slug": string,"twitch_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bot_enabled"?: boolean,"created_at"?: string,"current_session_id"?: string | null,"display_name": string,"id"?: string,"last_visited_at"?: string | null,"owner_id": string,"queue_open"?: boolean,"queue_version"?: number,"settings"?: NonNullable<Json>,"slug": string,"twitch_id"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"bot_enabled"?: boolean,"created_at"?: string,"current_session_id"?: string | null,"display_name"?: string,"id"?: string,"last_visited_at"?: string | null,"owner_id"?: string,"queue_open"?: boolean,"queue_version"?: number,"settings"?: NonNullable<Json>,"slug"?: string,"twitch_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "channels_current_session_fk"
      columns: ["current_session_id"]
isOneToOne: false
      referencedRelation: "stream_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "channels_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"eventsub_messages": {
                  Row: {
                    "message_id": string,"received_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "message_id": string,"received_at"?: string
                  }
                  Update: {
                    "message_id"?: string,"received_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"favorites": {
                  Row: {
                    "channel_id": string,"created_at": string,"display_name": string,"id": string,"song_id": string,"twitch_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel_id": string,"created_at"?: string,"display_name": string,"id"?: string,"song_id": string,"twitch_id": string
                  }
                  Update: {
                    "channel_id"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"song_id"?: string,"twitch_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"learning_requests": {
                  Row: {
                    "artist": string,"channel_id": string,"created_at": string,"id": string,"requested_by": string,"status": Database["public"]['Enums']["learning_status"],"title": string,"votes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "artist"?: string,"channel_id": string,"created_at"?: string,"id"?: string,"requested_by"?: string,"status"?: Database["public"]['Enums']["learning_status"],"title": string,"votes"?: number
                  }
                  Update: {
                    "artist"?: string,"channel_id"?: string,"created_at"?: string,"id"?: string,"requested_by"?: string,"status"?: Database["public"]['Enums']["learning_status"],"title"?: string,"votes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_requests_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    }
                  ]
                },"learning_votes": {
                  Row: {
                    "created_at": string,"request_id": string,"voter_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"request_id": string,"voter_key": string
                  }
                  Update: {
                    "created_at"?: string,"request_id"?: string,"voter_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_votes_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "learning_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"moderators": {
                  Row: {
                    "channel_id": string,"created_at": string,"id": string,"twitch_login": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel_id": string,"created_at"?: string,"id"?: string,"twitch_login": string
                  }
                  Update: {
                    "channel_id"?: string,"created_at"?: string,"id"?: string,"twitch_login"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderators_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    }
                  ]
                },"play_history": {
                  Row: {
                    "channel_id": string,"id": string,"note": string | null,"played_at": string,"requester_name": string | null,"song_artist": string,"song_id": string | null,"song_title": string,"source": Database["public"]['Enums']["request_source"] | null,"stream_session_id": string | null,"tip_amount": number
                  }
                  ComputedFields: never
                  Insert: {
                    "channel_id": string,"id"?: string,"note"?: string | null,"played_at"?: string,"requester_name"?: string | null,"song_artist"?: string,"song_id"?: string | null,"song_title": string,"source"?: Database["public"]['Enums']["request_source"] | null,"stream_session_id"?: string | null,"tip_amount"?: number
                  }
                  Update: {
                    "channel_id"?: string,"id"?: string,"note"?: string | null,"played_at"?: string,"requester_name"?: string | null,"song_artist"?: string,"song_id"?: string | null,"song_title"?: string,"source"?: Database["public"]['Enums']["request_source"] | null,"stream_session_id"?: string | null,"tip_amount"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "play_history_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "play_history_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "play_history_stream_session_id_fkey"
      columns: ["stream_session_id"]
isOneToOne: false
      referencedRelation: "stream_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"display_name": string,"id": string,"login": string,"twitch_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name": string,"id": string,"login": string,"twitch_id"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"login"?: string,"twitch_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"queue_items": {
                  Row: {
                    "channel_id": string,"created_at": string,"id": string,"is_priority": boolean,"note": string | null,"position": number,"requester_id": string | null,"requester_name": string,"requester_twitch_id": string | null,"song_id": string,"source": Database["public"]['Enums']["request_source"],"started_at": string | null,"status": Database["public"]['Enums']["queue_status"],"tip_amount": number
                  }
                  ComputedFields: never
                  Insert: {
                    "channel_id": string,"created_at"?: string,"id"?: string,"is_priority"?: boolean,"note"?: string | null,"position"?: number,"requester_id"?: string | null,"requester_name"?: string,"requester_twitch_id"?: string | null,"song_id": string,"source": Database["public"]['Enums']["request_source"],"started_at"?: string | null,"status"?: Database["public"]['Enums']["queue_status"],"tip_amount"?: number
                  }
                  Update: {
                    "channel_id"?: string,"created_at"?: string,"id"?: string,"is_priority"?: boolean,"note"?: string | null,"position"?: number,"requester_id"?: string | null,"requester_name"?: string,"requester_twitch_id"?: string | null,"song_id"?: string,"source"?: Database["public"]['Enums']["request_source"],"started_at"?: string | null,"status"?: Database["public"]['Enums']["queue_status"],"tip_amount"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "queue_items_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "queue_items_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "queue_items_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start"?: string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"request_log": {
                  Row: {
                    "channel_id": string,"created_at": string,"id": number,"stream_session_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "channel_id": string,"created_at"?: string,"id"?: never,"stream_session_id"?: string | null
                  }
                  Update: {
                    "channel_id"?: string,"created_at"?: string,"id"?: never,"stream_session_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_log_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_log_stream_session_id_fkey"
      columns: ["stream_session_id"]
isOneToOne: false
      referencedRelation: "stream_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"songs": {
                  Row: {
                    "artist": string,"channel_id": string,"created_at": string,"id": string,"is_new": boolean,"is_premium": boolean,"last_played_at": string | null,"notes": string | null,"tags": (string)[],"times_played": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "artist"?: string,"channel_id": string,"created_at"?: string,"id"?: string,"is_new"?: boolean,"is_premium"?: boolean,"last_played_at"?: string | null,"notes"?: string | null,"tags"?: (string)[],"times_played"?: number,"title": string
                  }
                  Update: {
                    "artist"?: string,"channel_id"?: string,"created_at"?: string,"id"?: string,"is_new"?: boolean,"is_premium"?: boolean,"last_played_at"?: string | null,"notes"?: string | null,"tags"?: (string)[],"times_played"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "songs_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    }
                  ]
                },"stream_sessions": {
                  Row: {
                    "channel_id": string,"ended_at": string | null,"id": string,"started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel_id": string,"ended_at"?: string | null,"id"?: string,"started_at"?: string
                  }
                  Update: {
                    "channel_id"?: string,"ended_at"?: string | null,"id"?: string,"started_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stream_sessions_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    }
                  ]
                },"tips": {
                  Row: {
                    "amount": number,"channel_id": string,"created_at": string,"currency": string,"donor_name": string,"external_id": string | null,"id": string,"message": string | null,"provider": string,"queue_item_id": string | null,"stream_session_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"channel_id": string,"created_at"?: string,"currency"?: string,"donor_name": string,"external_id"?: string | null,"id"?: string,"message"?: string | null,"provider"?: string,"queue_item_id"?: string | null,"stream_session_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"channel_id"?: string,"created_at"?: string,"currency"?: string,"donor_name"?: string,"external_id"?: string | null,"id"?: string,"message"?: string | null,"provider"?: string,"queue_item_id"?: string | null,"stream_session_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tips_channel_id_fkey"
      columns: ["channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tips_queue_item_id_fkey"
      columns: ["queue_item_id"]
isOneToOne: false
      referencedRelation: "queue_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tips_stream_session_id_fkey"
      columns: ["stream_session_id"]
isOneToOne: false
      referencedRelation: "stream_sessions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_assert_manager":
{ Args: { "p_channel_id": string }; Returns: undefined
                           },
"_ensure_session":
{ Args: { "p_channel_id": string }; Returns: string
                           },
"_finish_playing":
{ Args: { "p_channel_id": string,"p_record": boolean }; Returns: undefined
                           },
"_renumber_queue":
{ Args: { "p_channel_id": string }; Returns: undefined
                           },
"_touch_channel":
{ Args: { "p_channel_id": string }; Returns: undefined
                           },
"_vote_learning":
{ Args: { "p_request_id": string,"p_voter_key": string }; Returns: Json
                           },
"bot_set_live":
{ Args: { "p_channel_id": string,"p_live": boolean }; Returns: undefined
                           },
"channel_setting":
{ Args: { "p_key": string,"p_settings": Json }; Returns: Json
                           },
"channel_stats":
{ Args: { "p_channel_id": string }; Returns: Json
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_sec": number }; Returns: boolean
                           },
"claim_eventsub_message":
{ Args: { "p_message_id": string }; Returns: boolean
                           },
"clear_queue":
{ Args: { "p_channel_id": string }; Returns: Json
                           },
"confirm_tip":
{ Args: { "p_amount": number,"p_donor"?: string,"p_item_id": string }; Returns: Json
                           },
"create_default_commands":
{ Args: { "p_channel_id": string }; Returns: undefined
                           },
"default_channel_settings":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"end_session":
{ Args: { "p_channel_id": string }; Returns: undefined
                           },
"finish_current":
{ Args: { "p_channel_id": string }; Returns: Json
                           },
"is_channel_manager":
{ Args: { "p_channel_id": string }; Returns: boolean
                           },
"is_channel_owner":
{ Args: { "p_channel_id": string }; Returns: boolean
                           },
"is_service_role":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"learn_song":
{ Args: { "p_request_id": string }; Returns: Json
                           },
"move_to_top":
{ Args: { "p_item_id": string }; Returns: Json
                           },
"play_item":
{ Args: { "p_item_id": string }; Returns: Json
                           },
"play_next":
{ Args: { "p_channel_id": string,"p_record"?: boolean }; Returns: Json
                           },
"remove_item":
{ Args: { "p_item_id": string }; Returns: Json
                           },
"remove_last_request":
{ Args: { "p_channel_id": string,"p_twitch_id": string }; Returns: Json
                           },
"reorder_queue":
{ Args: { "p_channel_id": string,"p_item_ids": (string)[] }; Returns: Json
                           },
"request_song":
{ Args: { "p_channel_id": string,"p_is_manager"?: boolean,"p_is_subscriber"?: boolean,"p_is_vip"?: boolean,"p_note"?: string,"p_replace_item_id"?: string,"p_requester_id"?: string,"p_requester_name"?: string,"p_requester_twitch_id"?: string,"p_song_id": string,"p_source": Database["public"]['Enums']["request_source"],"p_tip_amount"?: number }; Returns: Json
                           },
"restore_saved":
{ Args: { "p_item_id": string }; Returns: Json
                           },
"save_item":
{ Args: { "p_item_id": string }; Returns: Json
                           },
"set_queue_open":
{ Args: { "p_channel_id": string,"p_open": boolean }; Returns: Json
                           },
"start_session":
{ Args: { "p_channel_id": string }; Returns: string
                           },
"suggest_learning":
{ Args: { "p_artist": string,"p_channel_id": string,"p_requested_by": string,"p_title": string,"p_voter_key": string }; Returns: Json
                           },
"touch_visit":
{ Args: { "p_channel_id": string }; Returns: undefined
                           },
"use_command_cooldown":
{ Args: { "p_command_id": string }; Returns: boolean
                           },
"vote_learning":
{ Args: { "p_request_id": string,"p_voter_key": string }; Returns: Json
                           }
          }
          Enums: {
            "bot_action": "REQUEST"|"REMOVE_LAST"|"REPLACE_LAST"|"CURRENT_SONG"|"NEXT_SONG"|"LAST_SONG"|"PLAYED_TODAY"|"HAS_SONG"|"LAST_PLAYED"|"SONG_DETAILS"|"FAVORITE"|"UNFAVORITE"|"SONGLIST_LINK"|"QUEUE_LINK"|"COMMANDS_LINK"|"CUSTOM","learning_status": "OPEN"|"LEARNED"|"REJECTED","queue_status": "QUEUED"|"PLAYING"|"SAVED","request_source": "TWITCH"|"SITE"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "bot_action": ["REQUEST", "REMOVE_LAST", "REPLACE_LAST", "CURRENT_SONG", "NEXT_SONG", "LAST_SONG", "PLAYED_TODAY", "HAS_SONG", "LAST_PLAYED", "SONG_DETAILS", "FAVORITE", "UNFAVORITE", "SONGLIST_LINK", "QUEUE_LINK", "COMMANDS_LINK", "CUSTOM"],"learning_status": ["OPEN", "LEARNED", "REJECTED"],"queue_status": ["QUEUED", "PLAYING", "SAVED"],"request_source": ["TWITCH", "SITE"]
          }
        }
} as const
