import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { generateId } from '../lib/ids.js';

const router = Router();

const stripSensitive = (user) => {
  if (!user) return user;
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

router.get('/', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (email) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return res.json(stripSensitive(user || null));
    }

    const list = await db.select().from(users);
    res.json(list.map(stripSensitive));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(stripSensitive(user));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email, image, role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'name and email are required' });
    }

    const userId = generateId('user');

    await db.insert(users).values({
      id: userId,
      name,
      email,
      image: image || null,
      role: role || 'USER',
    });

    const [created] = await db.select().from(users).where(eq(users.id, userId));
    res.status(201).json(stripSensitive(created));
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, image } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    await db
      .update(users)
      .set({ name, image: image || null, updatedAt: new Date() })
      .where(eq(users.id, req.params.id));

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json(stripSensitive(updated));
  } catch (error) {
    next(error);
  }
});

export default router;
