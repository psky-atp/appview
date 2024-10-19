import * as t from "tschema";

const FacetsSchema = t.optional(
  t.array(
    t.object(
      {
        index: t.object(
          {
            byteStart: t.number(),
            byteEnd: t.number(),
          },
          {
            additionalProperties: true,
          },
        ),
        features: t.array(
          t.one(
            t.object(
              { did: t.string() },
              {
                additionalProperties: true,
              },
            ), // Mention
            t.object(
              { uri: t.string() },
              {
                additionalProperties: true,
              },
            ), // Link
            t.object(
              { room: t.string() },
              {
                additionalProperties: true,
              },
            ), // Room
            t.object(
              { $type: t.string() },
              {
                additionalProperties: true,
              },
            ),
          ),
        ),
      },
      {
        additionalProperties: true,
      },
    ),
  ),
);
type FacetsI = t.Infer<typeof FacetsSchema>;

const GetMessagesSchema = t.object({
  uri: t.optional(t.string({ format: "uri" })),
  limit: t.integer({ minimum: 1, maximum: 100, default: 50 }),
  cursor: t.optional(t.integer({ minimum: 0 })),
});
type GetMessagesI = t.Infer<typeof GetMessagesSchema>;

const SocketQuerySchema = t.object({
  wantedRooms: t.optional(t.array(t.string({ format: "uri" }))),
});
type SocketQueryI = t.Infer<typeof SocketQuerySchema>;

export { FacetsSchema, GetMessagesSchema, SocketQuerySchema };
export type { FacetsI, GetMessagesI, SocketQueryI };
