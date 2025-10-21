import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('flight')
export class Flight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  flightNumber: string;

  @Column()
  departTime: string;

  @Column()
  arriveTime: string;

  @Column('real')
  price: number;

  // dta need for queries
@Column()
origin: string; 

@Column()
destination: string; 

@Column()
  date: string;
}
