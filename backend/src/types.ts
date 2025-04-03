import { Entity, Column, BaseEntity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Field, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
import { randomUUID, type UUID } from 'crypto';

export enum AppointmentStatus {
  Reserved = 'RESERVED',
  Confirmed = 'CONFIRMED',
}

registerEnumType(AppointmentStatus, { name: 'AppointmentStatus' });

@Entity()
@ObjectType()
export class Customer extends BaseEntity {
  @PrimaryColumn({ type: 'text' })
  @Field(type => ID)
  id: UUID = randomUUID()
  @Column({ unique: true })
  @Field()
  name!: string
  @Column({ unique: true })
  @Field()
  emailAddress!: string
};

@Entity()
@ObjectType()
export class CalendarSlot extends BaseEntity {
  @PrimaryColumn({ type: 'text' })
  @Field(type => ID)
  id: UUID = randomUUID()
  @Column({ type: 'integer', unique: true })
  startTimestamp!: number
  @Field(type => Date)
  startTime!: Date
  @Column({ type: 'integer', unique: true })
  endTimestamp!: number
  @Field(type => Date)
  endTime!: Date
  @Field(type => Int)
  durationInMinutes!: number
  @Column({ type: 'boolean' })
  @Field(type => Boolean)
  available!: boolean
};

@Entity()
@ObjectType()
export class Appointment extends BaseEntity {
  @PrimaryColumn({ type: 'text' })
  @Field(type => ID)
  id: UUID = randomUUID()
  @ManyToOne(type => Customer)
  @Field(type => Customer!)
  customer!: Customer
  @Column({ type: 'text' })
  @Field(type => AppointmentStatus)
  appointmentStatus!: AppointmentStatus
  @ManyToOne(type => CalendarSlot)
  @Field(type => CalendarSlot!)
  calendarSlot!: CalendarSlot
};

export interface Token {
  customerId: UUID;
}

export interface Context {
  customerId?: UUID;
  isAdmin: boolean;
}

export enum Roles {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
};