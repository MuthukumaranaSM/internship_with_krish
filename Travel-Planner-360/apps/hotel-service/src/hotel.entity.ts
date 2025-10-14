
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('hotel')
export class Hotel {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  hotelId: string; // Internal identifier

  @Column()
  name: string; 

  @Column('real') 
  rating: number; 

  @Column('real') 
  pricePerNight: number; 

  @Column()
  destination: string; // Lookup field 

  @Column({ nullable: true })
  lateCheckIn: boolean; // chaining ekata 
}