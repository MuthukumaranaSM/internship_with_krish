
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('hotel')
export class Hotel {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  hotelId: string;

  @Column()
  name: string; 

  @Column('real') 
  rating: number; 

  @Column('real') 
  pricePerNight: number; 

  @Column()
  destination: string; 
  
  @Column()
  date:string;

  @Column({ nullable: true })
  lateCheckIn: boolean; // chaining ekata 
}