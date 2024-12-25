import AWS from 'aws-sdk';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validatorMiddleware from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import httpErrorHandler from '@middy/http-error-handler';
import createError from 'http-errors';
import { getAuctionById } from './getAuction.js';
import placeBidSchema from '../lib/schemas/placeBidSchema.js';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);

  // Bid identity validation
  if (email === auction.seller) {
    throw new createError.Forbidden(`You cannot participate in your auction.`);
  }

  // Avoid double bidding
  if (email === auction.highestBid.bidder) {
    throw new createError.Forbidden(
      `You are already the highest bidder, wait till the others make their move.`
    );
  }

  // Auction status validation
  if (auction.status !== 'OPEN') {
    throw new createError.Forbidden(`You cannot bid on closed auctions!`);
  }

  //Bid amount validation
  if (amount < auction.highestBid.amount) {
    throw new createError.Forbidden(
      `Your bid must be higher that ${auction.highestBid.amount}!`
    );
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression:
      'set highestBid.amount = :amount, highestBid.bidder = :bidder',
    ExpressionAttributeValues: {
      ':amount': amount,
      ':bidder': email,
    },
    ReturnValues: 'ALL_NEW',
  };

  let updatedAuction;

  try {
    const result = await dynamodb.update(params).promise();
    updatedAuction = result.Attributes;

    return {
      statusCode: 200,
      body: JSON.stringify(updatedAuction),
    };
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }
}

export const handler = middy(placeBid)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler())
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema(placeBidSchema),
      ajvOptions: {
        strict: false,
      },
    })
  );

// export const handler = middy(placeBid)
//   .use(httpJsonBodyParser())
//   .use(httpEventNormalizer())
//   .use(httpErrorHandler());
