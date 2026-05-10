import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Post } from '../src/schemas/post.schema';
import { PostToken } from '../src/schemas/post-token.schema';

async function fixTokenizedPosts() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const postModel = app.get<Model<Post>>(getModelToken(Post.name));
  const postTokenModel = app.get<Model<PostToken>>(getModelToken(PostToken.name));

  console.log('Finding tokenized posts...');
  
  const tokenizedPosts = await postModel.find({ isTokenized: true }).lean();
  console.log(`Found ${tokenizedPosts.length} tokenized posts`);

  for (const post of tokenizedPosts) {
    console.log(`\nPost ID: ${post._id}`);
    console.log(`  Content: ${post.content.substring(0, 50)}...`);
    console.log(`  Token Supply: ${post.tokenSupply}`);
    console.log(`  Token Price: ${post.tokenPrice}`);
    
    // Check if PostToken record exists
    const postToken = await postTokenModel.findOne({ post: post._id });
    console.log(`  PostToken exists: ${!!postToken}`);
    
    // Fix posts with invalid configuration
    if (!post.tokenSupply || post.tokenSupply <= 0 || !post.tokenPrice || post.tokenPrice <= 0) {
      console.log(`  ⚠️  Invalid configuration - setting default values`);
      await postModel.findByIdAndUpdate(post._id, {
        tokenSupply: 1000,
        tokenPrice: 0.01,
      });
      console.log(`  ✅ Updated with supply: 1000, price: 0.01 SOL`);
    }
    
    // Create PostToken record if missing
    if (!postToken && post.tokenSupply > 0 && post.tokenPrice > 0) {
      const tokenMintAddress = `token_${post._id}_${Date.now()}`;
      await postTokenModel.create({
        post: post._id,
        creator: post.author,
        tokenMintAddress,
        totalSupply: post.tokenSupply,
        initialPrice: post.tokenPrice,
        currentPrice: post.tokenPrice,
        soldTokens: 0,
        totalVolume: 0,
      });
      
      await postModel.findByIdAndUpdate(post._id, {
        tokenMintAddress,
      });
      
      console.log(`  ✅ Created PostToken record`);
    }
  }

  console.log('\n✅ All tokenized posts have been fixed!');
  await app.close();
}

fixTokenizedPosts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
