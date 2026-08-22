import { router } from '../trpc';
import { classRouter } from './class';
import { assignmentRouter } from './assignment';
import { submissionRouter } from './submission';
import { gradeRouter } from './grade';
import { appealRouter } from './appeal';
import { notificationRouter } from './notification';

export const appRouter = router({
  class: classRouter,
  assignment: assignmentRouter,
  submission: submissionRouter,
  grade: gradeRouter,
  appeal: appealRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
