const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

(async () => {
  // Initialize Firebase Admin SDK
  let db;

  function initializeFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const databaseUrl = process.env.FIREBASE_DATABASE_URL;
    let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId) {
      throw new Error("FIREBASE_PROJECT_ID environment variable is required");
    }

    // Resolve relative path to absolute path
    if (credentialsPath && !path.isAbsolute(credentialsPath)) {
      credentialsPath = path.resolve(process.cwd(), credentialsPath);
    }

    let serviceAccount;

    if (credentialsPath && fs.existsSync(credentialsPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
        console.error(`[OK] Service account loaded`);
      } catch (err) {
        throw new Error(`Failed to parse service account file: ${err.message}`);
      }
    } else {
      throw new Error(
        `Service account file not found at: ${credentialsPath || "not specified"}`
      );
    }

    try {
      console.error(`[INFO] Initializing Firebase...`);
      const cert = admin.cert(serviceAccount);
      const app = admin.initializeApp({
        credential: cert,
        projectId,
        databaseURL: databaseUrl,
      });
      console.error("[OK] Firebase Admin SDK initialized");
      // Use getFirestore from firebase-admin/firestore
      return getFirestore(app);
    } catch (err) {
      throw new Error(`Failed to initialize Firebase: ${err.message}`);
    }
  }

  // Initialize Firebase
  try {
    db = initializeFirebase();
  } catch (err) {
    console.error("[ERROR] Fatal error:", err.message);
    process.exit(1);
  }

  // Define MCP tools
  const tools = [
    {
      name: "get_document",
      description: "Get a document from Firestore",
      inputSchema: {
        type: "object",
        properties: {
          collection: {
            type: "string",
            description: "Collection name",
          },
          document: {
            type: "string",
            description: "Document ID",
          },
        },
        required: ["collection", "document"],
      },
    },
    {
      name: "set_document",
      description: "Set/create a document in Firestore",
      inputSchema: {
        type: "object",
        properties: {
          collection: {
            type: "string",
            description: "Collection name",
          },
          document: {
            type: "string",
            description: "Document ID",
          },
          data: {
            type: "object",
            description: "Document data",
          },
          merge: {
            type: "boolean",
            description: "Merge with existing data (default: false)",
          },
        },
        required: ["collection", "document", "data"],
      },
    },
    {
      name: "update_document",
      description: "Update fields in a Firestore document",
      inputSchema: {
        type: "object",
        properties: {
          collection: {
            type: "string",
            description: "Collection name",
          },
          document: {
            type: "string",
            description: "Document ID",
          },
          data: {
            type: "object",
            description: "Fields to update",
          },
        },
        required: ["collection", "document", "data"],
      },
    },
    {
      name: "delete_document",
      description: "Delete a document from Firestore",
      inputSchema: {
        type: "object",
        properties: {
          collection: {
            type: "string",
            description: "Collection name",
          },
          document: {
            type: "string",
            description: "Document ID",
          },
        },
        required: ["collection", "document"],
      },
    },
    {
      name: "query_collection",
      description: "Query documents from a Firestore collection",
      inputSchema: {
        type: "object",
        properties: {
          collection: {
            type: "string",
            description: "Collection name",
          },
          where: {
            type: "array",
            description:
              "Where conditions: [{field, operator, value}, ...]",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                operator: {
                  type: "string",
                  enum: ["==", "<", "<=", ">", ">=", "!=", "array-contains"],
                },
                value: {},
              },
              required: ["field", "operator", "value"],
            },
          },
          limit: {
            type: "number",
            description: "Limit number of results",
          },
          orderBy: {
            type: "array",
            description: "Order by fields: [{field, direction}, ...]",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                direction: { type: "string", enum: ["asc", "desc"] },
              },
              required: ["field"],
            },
          },
        },
        required: ["collection"],
      },
    },
    {
      name: "list_collections",
      description: "List all collections in Firestore",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "batch_write",
      description: "Perform batch write operations",
      inputSchema: {
        type: "object",
        properties: {
          operations: {
            type: "array",
            description: "Array of operations to perform",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["set", "update", "delete"],
                },
                collection: { type: "string" },
                document: { type: "string" },
                data: { type: "object" },
              },
              required: ["type", "collection", "document"],
            },
          },
        },
        required: ["operations"],
      },
    },
  ];

  // Tool implementations
  async function getDocument(collection, document) {
    const doc = await db.collection(collection).doc(document).get();
    if (!doc.exists) {
      return { error: "Document not found" };
    }
    return {
      id: doc.id,
      data: doc.data(),
    };
  }

  async function setDocument(collection, document, data, merge = false) {
    await db.collection(collection).doc(document).set(data, { merge });
    return {
      success: true,
      collection,
      document,
    };
  }

  async function updateDocument(collection, document, data) {
    await db.collection(collection).doc(document).update(data);
    return {
      success: true,
      collection,
      document,
    };
  }

  async function deleteDocument(collection, document) {
    await db.collection(collection).doc(document).delete();
    return {
      success: true,
      collection,
      document,
    };
  }

  async function queryCollection(collection, where, limit, orderBy) {
    let query = db.collection(collection);

    if (where && where.length > 0) {
      for (const condition of where) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    if (orderBy && orderBy.length > 0) {
      for (const order of orderBy) {
        query = query.orderBy(order.field, order.direction || "asc");
      }
    }

    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    const results = [];
    snapshot.forEach((doc) => {
      results.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    return {
      count: results.length,
      results,
    };
  }

  async function listCollections() {
    const collections = await db.listCollections();
    return {
      count: collections.length,
      collections: collections.map((col) => col.id),
    };
  }

  async function batchWrite(operations) {
    const batch = db.batch();

    for (const op of operations) {
      const docRef = db.collection(op.collection).doc(op.document);

      if (op.type === "set") {
        batch.set(docRef, op.data || {});
      } else if (op.type === "update") {
        batch.update(docRef, op.data || {});
      } else if (op.type === "delete") {
        batch.delete(docRef);
      }
    }

    await batch.commit();
    return {
      success: true,
      operationCount: operations.length,
    };
  }

  // MCP Server setup
  const server = new Server(
    {
      name: "firebase-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "get_document":
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  await getDocument(args.collection, args.document),
                  null,
                  2
                ),
              },
            ],
          };

        case "set_document":
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  await setDocument(args.collection, args.document, args.data, args.merge),
                  null,
                  2
                ),
              },
            ],
          };

        case "update_document":
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  await updateDocument(args.collection, args.document, args.data),
                  null,
                  2
                ),
              },
            ],
          };

        case "delete_document":
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  await deleteDocument(args.collection, args.document),
                  null,
                  2
                ),
              },
            ],
          };

        case "query_collection":
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  await queryCollection(
                    args.collection,
                    args.where,
                    args.limit,
                    args.orderBy
                  ),
                  null,
                  2
                ),
              },
            ],
          };

        case "list_collections":
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(await listCollections(), null, 2),
              },
            ],
          };

        case "batch_write":
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(await batchWrite(args.operations), null, 2),
              },
            ],
          };

        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[OK] Firebase MCP server started");
  }

  main().catch((error) => {
    console.error("[ERROR] Server error:", error);
    process.exit(1);
  });
})();
  {
    name: "get_document",
    description: "Get a document from Firestore",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description: "Collection name",
        },
        document: {
          type: "string",
          description: "Document ID",
        },
      },
      required: ["collection", "document"],
    },
  },
  {
    name: "set_document",
    description: "Set/create a document in Firestore",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description: "Collection name",
        },
        document: {
          type: "string",
          description: "Document ID",
        },
        data: {
          type: "object",
          description: "Document data",
        },
        merge: {
          type: "boolean",
          description: "Merge with existing data (default: false)",
        },
      },
      required: ["collection", "document", "data"],
    },
  },
  {
    name: "update_document",
    description: "Update fields in a Firestore document",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description: "Collection name",
        },
        document: {
          type: "string",
          description: "Document ID",
        },
        data: {
          type: "object",
          description: "Fields to update",
        },
      },
      required: ["collection", "document", "data"],
    },
  },
  {
    name: "delete_document",
    description: "Delete a document from Firestore",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description: "Collection name",
        },
        document: {
          type: "string",
          description: "Document ID",
        },
      },
      required: ["collection", "document"],
    },
  },
  {
    name: "query_collection",
    description: "Query documents from a Firestore collection",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description: "Collection name",
        },
        where: {
          type: "array",
          description:
            "Where conditions: [{field, operator, value}, ...]",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              operator: {
                type: "string",
                enum: ["==", "<", "<=", ">", ">=", "!=", "array-contains"],
              },
              value: {},
            },
            required: ["field", "operator", "value"],
          },
        },
        limit: {
          type: "number",
          description: "Limit number of results",
        },
        orderBy: {
          type: "array",
          description: "Order by fields: [{field, direction}, ...]",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              direction: { type: "string", enum: ["asc", "desc"] },
            },
            required: ["field"],
          },
        },
      },
      required: ["collection"],
    },
  },
  {
    name: "list_collections",
    description: "List all collections in Firestore",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "batch_write",
    description: "Perform batch write operations",
    inputSchema: {
      type: "object",
      properties: {
        operations: {
          type: "array",
          description: "Array of operations to perform",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["set", "update", "delete"],
              },
              collection: { type: "string" },
              document: { type: "string" },
              data: { type: "object" },
            },
            required: ["type", "collection", "document"],
          },
        },
      },
      required: ["operations"],
    },
  },
];

// Tool implementations
async function getDocument(collection, document) {
  const doc = await db.collection(collection).doc(document).get();
  if (!doc.exists) {
    return { error: "Document not found" };
  }
  return {
    id: doc.id,
    data: doc.data(),
  };
}

async function setDocument(collection, document, data, merge = false) {
  await db.collection(collection).doc(document).set(data, { merge });
  return {
    success: true,
    collection,
    document,
  };
}

async function updateDocument(collection, document, data) {
  await db.collection(collection).doc(document).update(data);
  return {
    success: true,
    collection,
    document,
  };
}

async function deleteDocument(collection, document) {
  await db.collection(collection).doc(document).delete();
  return {
    success: true,
    collection,
    document,
  };
}

async function queryCollection(collection, where, limit, orderBy) {
  let query = db.collection(collection);

  if (where && where.length > 0) {
    for (const condition of where) {
      query = query.where(condition.field, condition.operator, condition.value);
    }
  }

  if (orderBy && orderBy.length > 0) {
    for (const order of orderBy) {
      query = query.orderBy(order.field, order.direction || "asc");
    }
  }

  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  const results = [];
  snapshot.forEach((doc) => {
    results.push({
      id: doc.id,
      data: doc.data(),
    });
  });

  return {
    count: results.length,
    results,
  };
}

async function listCollections() {
  const collections = await db.listCollections();
  return {
    count: collections.length,
    collections: collections.map((col) => col.id),
  };
}

async function batchWrite(operations) {
  const batch = db.batch();

  for (const op of operations) {
    const docRef = db.collection(op.collection).doc(op.document);

    if (op.type === "set") {
      batch.set(docRef, op.data || {});
    } else if (op.type === "update") {
      batch.update(docRef, op.data || {});
    } else if (op.type === "delete") {
      batch.delete(docRef);
    }
  }

  await batch.commit();
  return {
    success: true,
    operationCount: operations.length,
  };
}

// MCP Server setup
const server = new Server(
  {
    name: "firebase-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_document":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await getDocument(args.collection, args.document),
                null,
                2
              ),
            },
          ],
        };

      case "set_document":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await setDocument(args.collection, args.document, args.data, args.merge),
                null,
                2
              ),
            },
          ],
        };

      case "update_document":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await updateDocument(args.collection, args.document, args.data),
                null,
                2
              ),
            },
          ],
        };

      case "delete_document":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await deleteDocument(args.collection, args.document),
                null,
                2
              ),
            },
          ],
        };

      case "query_collection":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await queryCollection(
                  args.collection,
                  args.where,
                  args.limit,
                  args.orderBy
                ),
                null,
                2
              ),
            },
          ],
        };

      case "list_collections":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await listCollections(), null, 2),
            },
          ],
        };

      case "batch_write":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await batchWrite(args.operations), null, 2),
            },
          ],
        };

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✓ Firebase MCP server started and ready");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
