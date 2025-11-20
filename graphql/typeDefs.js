// In: graphql/typeDefs.js

const { gql } = require('apollo-server-express');

module.exports = gql`
  scalar Upload

  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
  }

  type Coordinates {
    lat: Float!
    lng: Float!
  }

  type Location {
    id: ID!
    name: String!
    description: String!
    aiSummary: String
    imageUrl: String!
    status: String!
    submittedBy: User!
    coordinates: Coordinates!
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type SiteImage {
    id: ID!
    key: String!
    imageUrl: String!
    description: String
  }

  type TextContent {
    id: ID!
    key: String!
    content: String!
    page: String
    description: String
  }

  type HistoricalEvent {
    id: ID!
    month: Int!
    day: Int!
    title: String!
    description: String!
    imageUrl: String!
    link: String
    isFeatured: Boolean
  }

  type QRCode {
    id: ID!
    dataUrl: String!
  }

  type TownComment {
    id: ID!
    text: String!
    author: User!
    createdAt: String!
    townName: String!
  }
  
  type Query {
    hello: String
    getAllLocations(status: String): [Location!]
    getPendingLocations: [Location!]
    getSiteImages: [SiteImage!]
    getTextContents: [TextContent!]
    getHistoricalEvents: [HistoricalEvent!]
    getComments(locationId: ID!): [Comment!]
    getQrCodeForLocation(locationId: ID!): QRCode
    getWifiQrCode: QRCode
    getCommentsForTown(townName: String!): [TownComment!]
    # --- NEW, SIMPLIFIED QUERY for Town QR Codes ---
    getQrCodeForTown(townName: String!): QRCode
  }

  type Mutation {
    # User Mutations
    register(username: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    # Content Mutations
    submitLocation(name: String!, description: String!, imageUrl: String!, lat: Float!, lng: Float!): Location!
    approveLocation(locationId: ID!): Location!

    # Comment Mutations
    addComment(locationId: ID!, text: String!): Comment!

    # Site Image Mutations
    uploadSiteImage(key: String!, description: String, file: Upload!): SiteImage!
    deleteSiteImage(key: String!): SiteImage

    # Text Content Mutation
    updateTextContent(key: String!, content: String!, page: String, description: String): TextContent!

    # Historical Event Mutations
    addHistoricalEvent(month: Int!, day: Int!, title: String!, description: String!, imageUrl: String!, link: String): HistoricalEvent!
    updateHistoricalEvent(id: ID!, month: Int, day: Int, title: String, description: String, imageUrl: String, link: String): HistoricalEvent!
    deleteHistoricalEvent(id: ID!): HistoricalEvent

    # Featured Event Mutations
    setFeaturedEvent(id: ID!): HistoricalEvent!
    unsetFeaturedEvent: HistoricalEvent

    # Town Comment Mutation
    addCommentToTown(townName: String!, text: String!): TownComment!

    # NOTE: generateTownScanQrCode mutation has been removed.
  }
`;