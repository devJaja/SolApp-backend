import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../../schemas/post.schema';
import { Like, LikeDocument } from '../../schemas/like.schema';
import { Comment, CommentDocument } from '../../schemas/comment.schema';
import { CommentLike, CommentLikeDocument } from '../../schemas/comment-like.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { PostToken, PostTokenDocument } from '../../schemas/post-token.schema';
import { TokenHolder, TokenHolderDocument } from '../../schemas/token-holder.schema';
import { Tip, TipDocument } from '../../schemas/tip.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { SolanaService } from '../solana/solana.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(CommentLike.name) private commentLikeModel: Model<CommentLikeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PostToken.name) private postTokenModel: Model<PostTokenDocument>,
    @InjectModel(TokenHolder.name) private tokenHolderModel: Model<TokenHolderDocument>,
    @InjectModel(Tip.name) private tipModel: Model<TipDocument>,
    private notificationsService: NotificationsService,
    private solanaService: SolanaService,
  ) { }

  async createPost(userId: string, createPostDto: CreatePostDto) {
    const post = await this.postModel.create({
      author: userId,
      content: createPostDto.content,
      images: createPostDto.images || [],
      isTokenized: createPostDto.isTokenized || false,
      tokenSupply: createPostDto.tokenSupply || 0,
      tokenPrice: createPostDto.tokenPrice || 0,
    });

    // If tokenized, create token record
    if (createPostDto.isTokenized && createPostDto.tokenSupply && createPostDto.tokenPrice) {
      // Generate a mock token mint address (in production, create actual SPL token)
      const tokenMintAddress = `token_${post._id}_${Date.now()}`;

      await this.postTokenModel.create({
        post: post._id,
        creator: userId,
        tokenMintAddress,
        totalSupply: createPostDto.tokenSupply,
        initialPrice: createPostDto.tokenPrice,
        currentPrice: createPostDto.tokenPrice,
        soldTokens: 0,
        totalVolume: 0,
      });

      // Update post with token address
      post.tokenMintAddress = tokenMintAddress;
      await post.save();
    }

    // Increment user's post count
    await this.userModel.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    return this.populatePost(post);
  }

  async getFeed(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar')
      .lean();

    const postsWithLikeStatus = await Promise.all(
      posts.map(async (post: any) => {
        // Convert userId string to ObjectId for proper comparison
        const liked = await this.likeModel.findOne({
          user: new Types.ObjectId(userId),
          post: post._id,
        }).lean();

        return {
          ...post,
          id: post._id.toString(),
          author: {
            ...post.author,
            id: (post.author as any)._id.toString(),
          },
          isLiked: !!liked,
        };
      }),
    );

    return postsWithLikeStatus;
  }

  async getPostById(postId: string, userId: string) {
    const post = await this.postModel
      .findById(postId)
      .populate('author', 'username name avatar')
      .lean();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Convert userId string to ObjectId for proper comparison
    const liked = await this.likeModel.findOne({
      user: new Types.ObjectId(userId),
      post: new Types.ObjectId(postId),
    }).lean();

    return {
      ...post,
      id: post._id.toString(),
      isLiked: !!liked,
    };
  }

  async getUserPosts(username: string, userId: string, page: number = 1, limit: number = 20) {
    console.log('[getUserPosts] Called with username:', username, 'userId:', userId);
    
    const user = await this.userModel.findOne({ username });
    console.log('[getUserPosts] Found user:', user ? { _id: user._id, username: user.username } : 'NOT FOUND');
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;

    // Debug: Check total posts for this user
    const totalPosts = await this.postModel.countDocuments({ author: user._id });
    console.log('[getUserPosts] Total posts for user:', totalPosts);

    // Debug: Get all posts without pagination to see what's there
    const allPosts = await this.postModel.find({ author: user._id }).lean();
    console.log('[getUserPosts] All posts (no pagination):', allPosts.length);
    console.log('[getUserPosts] Sample post:', allPosts[0]);

    const posts = await this.postModel
      .find({ author: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar')
      .lean();

    console.log('[getUserPosts] Found posts count after pagination:', posts.length);
    console.log('[getUserPosts] First post:', posts[0] ? { _id: posts[0]._id, content: posts[0].content?.substring(0, 50) } : 'NONE');

    const postsWithLikeStatus = await Promise.all(
      posts.map(async (post) => {
        // Convert userId string to ObjectId for proper comparison
        const liked = await this.likeModel.findOne({
          user: new Types.ObjectId(userId),
          post: post._id,
        }).lean();

        return {
          ...post,
          id: post._id.toString(),
          author: {
            ...post.author,
            id: (post.author as any)._id.toString(),
          },
          isLiked: !!liked,
        };
      }),
    );

    console.log('[getUserPosts] Returning posts count:', postsWithLikeStatus.length);
    return postsWithLikeStatus;
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.author.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await post.deleteOne();

    // Decrement user's post count
    await this.userModel.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });

    // Delete associated likes and comments
    await this.likeModel.deleteMany({ post: postId });
    await this.commentModel.deleteMany({ post: postId });

    return { message: 'Post deleted successfully' };
  }

  async likePost(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Convert userId string to ObjectId for proper comparison
    const existingLike = await this.likeModel.findOne({
      user: new Types.ObjectId(userId),
      post: new Types.ObjectId(postId),
    });

    if (existingLike) {
      return { message: 'Post already liked', isLiked: true };
    }

    await this.likeModel.create({ 
      user: new Types.ObjectId(userId), 
      post: new Types.ObjectId(postId) 
    });
    await this.postModel.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

    // Send notification to post author
    if (post.author.toString() !== userId) {
      const liker = await this.userModel.findById(userId);
      await this.notificationsService.createNotification({
        recipient: post.author.toString(),
        sender: userId,
        type: 'like',
        message: `${liker?.username} liked your post`,
        post: postId,
      });
    }

    return { message: 'Post liked', isLiked: true };
  }

  async unlikePost(postId: string, userId: string) {
    // Convert userId string to ObjectId for proper comparison
    const like = await this.likeModel.findOneAndDelete({
      user: new Types.ObjectId(userId),
      post: new Types.ObjectId(postId),
    });

    if (!like) {
      return { message: 'Post not liked', isLiked: false };
    }

    await this.postModel.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

    return { message: 'Post unliked', isLiked: false };
  }

  async createComment(postId: string, userId: string, createCommentDto: CreateCommentDto) {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.commentModel.create({
      author: userId,
      post: postId,
      content: createCommentDto.content,
      parentComment: createCommentDto.parentCommentId || undefined,
    });

    // Increment post's comment count
    await this.postModel.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    // If it's a reply, increment parent comment's reply count
    if (createCommentDto.parentCommentId) {
      await this.commentModel.findByIdAndUpdate(
        createCommentDto.parentCommentId,
        { $inc: { repliesCount: 1 } },
      );
    }

    // Send notification to post author
    if (post.author.toString() !== userId) {
      const commenter = await this.userModel.findById(userId);
      await this.notificationsService.createNotification({
        recipient: post.author.toString(),
        sender: userId,
        type: 'comment',
        message: `${commenter?.username} commented on your post`,
        post: postId,
      });
    }

    return this.populateComment(comment);
  }

  async getComments(postId: string, userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const comments = await this.commentModel
      .find({ post: postId, parentComment: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar')
      .lean();

    // Check if user liked each comment
    const commentsWithLikes = await Promise.all(
      comments.map(async (comment) => {
        // Convert userId string to ObjectId for proper comparison
        const liked = await this.commentLikeModel.findOne({
          comment: comment._id,
          user: new Types.ObjectId(userId),
        }).lean();

        return {
          ...comment,
          id: comment._id.toString(),
          isLiked: !!liked,
        };
      }),
    );

    return commentsWithLikes;
  }

  async getReplies(commentId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const replies = await this.commentModel
      .find({ parentComment: commentId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar')
      .lean();

    return replies.map((reply) => ({
      ...reply,
      id: reply._id,
    }));
  }

  private async populatePost(post: PostDocument) {
    await post.populate('author', 'username name avatar');
    return {
      ...post.toObject(),
      id: post._id,
      isLiked: false,
    };
  }

  private async populateComment(comment: CommentDocument) {
    await comment.populate('author', 'username name avatar');
    return {
      ...comment.toObject(),
      id: comment._id,
    };
  }

  async buyPostToken(postId: string, userId: string, amount: number) {
    console.log(`[BuyToken] Starting purchase: postId=${postId}, userId=${userId}, amount=${amount}`);

    const post = await this.postModel.findById(postId);
    if (!post) {
      console.error(`[BuyToken] Post not found: ${postId}`);
      throw new NotFoundException('Post not found');
    }

    console.log(`[BuyToken] Post found: isTokenized=${post.isTokenized}, tokenSupply=${post.tokenSupply}, tokenPrice=${post.tokenPrice}`);

    if (!post.isTokenized) {
      throw new BadRequestException('Post is not tokenized');
    }

    let postToken = await this.postTokenModel.findOne({ post: postId });
    console.log(`[BuyToken] PostToken record exists: ${!!postToken}`);

    // If post is tokenized but no token record exists, create it
    if (!postToken) {
      if (!post.tokenSupply || post.tokenSupply <= 0) {
        console.error(`[BuyToken] Invalid token supply: ${post.tokenSupply}`);
        throw new BadRequestException('Post token supply is not configured. Please contact the post author.');
      }

      if (!post.tokenPrice || post.tokenPrice <= 0) {
        console.error(`[BuyToken] Invalid token price: ${post.tokenPrice}`);
        throw new BadRequestException('Post token price is not configured. Please contact the post author.');
      }

      console.log(`[BuyToken] Creating PostToken record for post ${postId}`);
      const tokenMintAddress = `token_${post._id}_${Date.now()}`;
      postToken = await this.postTokenModel.create({
        post: postId,
        creator: post.author,
        tokenMintAddress,
        totalSupply: post.tokenSupply,
        initialPrice: post.tokenPrice,
        currentPrice: post.tokenPrice,
        soldTokens: 0,
        totalVolume: 0,
      });

      post.tokenMintAddress = tokenMintAddress;
      await post.save();
      console.log(`[BuyToken] PostToken record created successfully`);
    }

    const availableTokens = postToken.totalSupply - postToken.soldTokens;
    console.log(`[BuyToken] Available tokens: ${availableTokens}, Requested: ${amount}`);

    if (amount > availableTokens) {
      throw new BadRequestException(`Not enough tokens available. Only ${availableTokens} tokens remaining.`);
    }

    const totalCost = amount * postToken.currentPrice;
    console.log(`[BuyToken] Total cost: ${totalCost} SOL`);

    // Get buyer and seller wallets
    const buyer = await this.userModel.findById(userId);
    const seller = await this.userModel.findById(post.author);

    if (!buyer || !seller) {
      throw new NotFoundException('User not found');
    }

    console.log(`[BuyToken] Initiating SOL transfer from ${buyer.walletAddress} to ${seller.walletAddress}`);

    // Transfer SOL from buyer to seller
    const signature = await this.solanaService.sendTransaction(
      buyer.walletAddress,
      buyer.encryptedPrivateKey,
      seller.walletAddress,
      totalCost,
    );

    console.log(`[BuyToken] Transaction successful: ${signature}`);

    // Update or create token holder record
    const existingHolder = await this.tokenHolderModel.findOne({
      user: userId,
      post: postId,
    });

    if (existingHolder) {
      const newTotalAmount = existingHolder.amount + amount;
      const newTotalInvested = existingHolder.totalInvested + totalCost;
      existingHolder.amount = newTotalAmount;
      existingHolder.totalInvested = newTotalInvested;
      existingHolder.purchasePrice = newTotalInvested / newTotalAmount;
      await existingHolder.save();
      console.log(`[BuyToken] Updated existing holder record`);
    } else {
      await this.tokenHolderModel.create({
        user: userId,
        post: postId,
        tokenMintAddress: postToken.tokenMintAddress,
        amount,
        purchasePrice: postToken.currentPrice,
        totalInvested: totalCost,
      });
      console.log(`[BuyToken] Created new holder record`);

      // Increment token holders count
      await this.postModel.findByIdAndUpdate(postId, { $inc: { tokenHolders: 1 } });
    }

    // Update post token stats
    postToken.soldTokens += amount;
    postToken.totalVolume += totalCost;
    // Simple price increase: 1% per 10% of supply sold
    postToken.currentPrice = postToken.initialPrice * (1 + (postToken.soldTokens / postToken.totalSupply) * 0.1);
    await postToken.save();

    // Update post token price
    await this.postModel.findByIdAndUpdate(postId, {
      tokenPrice: postToken.currentPrice,
    });

    // Update buyer's portfolio
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { totalInvested: totalCost },
    });

    // Send notification to post author
    await this.notificationsService.createNotification({
      recipient: post.author.toString(),
      sender: userId,
      type: 'token_purchase',
      message: `${buyer.username} bought ${amount} tokens of your post`,
      post: postId,
      amount: totalCost,
    });

    console.log(`[BuyToken] Purchase completed successfully`);

    return {
      message: 'Tokens purchased successfully',
      signature,
      amount,
      totalCost,
      newPrice: postToken.currentPrice,
    };
  }

  async tipPost(postId: string, userId: string, amount: number, message?: string) {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.author.toString() === userId) {
      throw new BadRequestException('Cannot tip your own post');
    }

    // Get tipper and recipient wallets
    const tipper = await this.userModel.findById(userId);
    const recipient = await this.userModel.findById(post.author);

    if (!tipper || !recipient) {
      throw new NotFoundException('User not found');
    }

    // Transfer SOL
    const signature = await this.solanaService.sendTransaction(
      tipper.walletAddress,
      tipper.encryptedPrivateKey,
      recipient.walletAddress,
      amount,
    );

    // Create tip record
    await this.tipModel.create({
      sender: userId,
      recipient: post.author,
      post: postId,
      amount,
      signature,
      message,
    });

    // Update post tip stats
    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { tipsCount: 1, totalTipsAmount: amount },
    });

    // Send notification
    await this.notificationsService.createNotification({
      recipient: post.author.toString(),
      sender: userId,
      type: 'tip',
      message: `${tipper.username} tipped you ${amount} SOL on your post`,
      post: postId,
      amount,
    });

    return {
      message: 'Tip sent successfully',
      signature,
      amount,
    };
  }

  async getPostTips(postId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const tips = await this.tipModel
      .find({ post: postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username name avatar')
      .lean();

    return tips.map((tip) => ({
      ...tip,
      id: tip._id,
    }));
  }

  async getUserPortfolio(userId: string) {
    const holdings = await this.tokenHolderModel
      .find({ user: userId })
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'username name avatar',
        },
      })
      .lean();

    // Calculate current portfolio value
    let totalValue = 0;
    let totalInvested = 0;

    const portfolioItems = await Promise.all(
      holdings.map(async (holding: any) => {
        const postToken = await this.postTokenModel.findOne({ post: holding.post._id });
        const currentValue = holding.amount * (postToken?.currentPrice || 0);
        totalValue += currentValue;
        totalInvested += holding.totalInvested;

        return {
          id: holding._id.toString(),
          post: {
            ...holding.post,
            id: holding.post._id.toString(),
            author: {
              ...holding.post.author,
              id: holding.post.author._id.toString(),
            },
          },
          amount: holding.amount,
          purchasePrice: holding.purchasePrice,
          currentPrice: postToken?.currentPrice || 0,
          totalInvested: holding.totalInvested,
          currentValue,
          profitLoss: currentValue - holding.totalInvested,
          profitLossPercentage: ((currentValue - holding.totalInvested) / holding.totalInvested) * 100,
        };
      }),
    );

    // Update user's portfolio value
    await this.userModel.findByIdAndUpdate(userId, {
      portfolioValue: totalValue,
    });

    return {
      totalValue,
      totalInvested,
      totalProfitLoss: totalValue - totalInvested,
      totalProfitLossPercentage: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      holdings: portfolioItems,
    };
  }

  async getUserComments(username: string, currentUserId: string, page: number = 1, limit: number = 20) {
    const user = await this.userModel.findOne({ username });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;

    const comments = await this.commentModel
      .find({ author: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar')
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'username name avatar',
        },
      })
      .lean();

    return comments.map((comment: any) => ({
      ...comment,
      id: comment._id.toString(),
      author: {
        ...comment.author,
        id: comment.author._id.toString(),
      },
      post: comment.post ? {
        ...comment.post,
        id: comment.post._id.toString(),
        author: {
          ...comment.post.author,
          id: comment.post.author._id.toString(),
        },
      } : null,
    }));
  }

  async getUserLikes(username: string, currentUserId: string, page: number = 1, limit: number = 20) {
    const user = await this.userModel.findOne({ username });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;

    const likes = await this.likeModel
      .find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'username name avatar',
        },
      })
      .lean();

    // Get liked posts with full details
    const posts = await Promise.all(
      likes.map(async (like: any) => {
        if (!like.post) return null;

        const post = like.post;
        // Convert userId string to ObjectId for proper comparison
        const isLiked = await this.likeModel.findOne({ 
          post: post._id, 
          user: new Types.ObjectId(currentUserId) 
        }).lean();

        return {
          ...post,
          id: post._id.toString(),
          author: {
            ...post.author,
            id: post.author._id.toString(),
          },
          isLiked: !!isLiked,
        };
      }),
    );

    return posts.filter(post => post !== null);
  }

  async likeComment(commentId: string, userId: string) {
    try {
      const comment = await this.commentModel.findById(commentId);
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Convert userId string to ObjectId for proper comparison
      const existingLike = await this.commentLikeModel.findOne({
        user: new Types.ObjectId(userId),
        comment: new Types.ObjectId(commentId),
      });

      if (existingLike) {
        return { message: 'Comment already liked', isLiked: true };
      }

      await this.commentLikeModel.create({ 
        user: new Types.ObjectId(userId), 
        comment: new Types.ObjectId(commentId) 
      });
      await this.commentModel.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } });

      // Send notification to comment author
      if (comment.author.toString() !== userId) {
        const liker = await this.userModel.findById(userId);
        await this.notificationsService.createNotification({
          recipient: comment.author.toString(),
          sender: userId,
          type: 'comment_like',
          message: `${liker?.username} liked your comment`,
          post: comment.post.toString(),
        });
      }

      return { message: 'Comment liked', isLiked: true };
    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  }

  async unlikeComment(commentId: string, userId: string) {
    // Convert userId string to ObjectId for proper comparison
    const like = await this.commentLikeModel.findOneAndDelete({
      user: new Types.ObjectId(userId),
      comment: new Types.ObjectId(commentId),
    });

    if (!like) {
      return { message: 'Comment not liked', isLiked: false };
    }

    await this.commentModel.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } });

    return { message: 'Comment unliked', isLiked: false };
  }

  async getCommentReplies(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const replies = await this.commentModel
      .find({ parentComment: commentId })
      .sort({ createdAt: 1 })
      .populate('author', 'username name avatar')
      .lean();

    // Check if user liked each reply
    const repliesWithLikes = await Promise.all(
      replies.map(async (reply) => {
        // Convert userId string to ObjectId for proper comparison
        const liked = await this.commentLikeModel.findOne({
          comment: reply._id,
          user: new Types.ObjectId(userId),
        }).lean();

        return {
          ...reply,
          id: reply._id.toString(),
          isLiked: !!liked,
        };
      }),
    );

    return repliesWithLikes;
  }
}
