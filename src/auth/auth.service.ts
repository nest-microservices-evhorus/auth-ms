import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from 'generated/prisma';
import * as bcrypt from 'bcryptjs';
import { LoginUserDto, RegisterUserDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { envs } from 'src/config';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('MongoDB connected');
  }

  async verifyToken(token: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
      const { sub, iat, exp, ...user } = await this.jwtService.verify(token, {
        secret: envs.jwtSecret,
      });

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: user,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        token: await this.signJWT(user),
      };
    } catch (error) {
      console.log(error);
      throw new RpcException({ status: 401, message: 'invalid Token' });
    }
  }

  async signJWT(payload: JwtPayload) {
    return this.jwtService.signAsync(payload);
  }

  async registerUser(registerDto: RegisterUserDto) {
    const { email, name, password } = registerDto;

    try {
      const user = await this.user.findUnique({
        where: { email: email },
      });

      if (user) {
        throw new RpcException({ status: 400, message: 'User already exists' });
      }

      const newUser = await this.user.create({
        data: {
          email: email,
          name: name,
          password: bcrypt.hashSync(password, 10),
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: __, ...rest } = newUser;

      return {
        user: rest,
        token: this.signJWT(rest),
      };
    } catch (error) {
      throw new RpcException({
        status: 400,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: error.message,
      });
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    try {
      const user = await this.user.findUnique({
        where: { email: email },
      });

      if (!user) {
        throw new RpcException({
          status: 400,
          message: 'User/Password not valid',
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);

      if (!isPasswordValid) {
        throw new RpcException({
          status: 400,
          message: 'User/Password not valid',
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: __, ...rest } = user;

      return {
        user: rest,
        token: await this.signJWT(rest),
      };
    } catch (error) {
      throw new RpcException({
        status: 400,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: error.message,
      });
    }
  }
}
