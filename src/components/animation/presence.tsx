import { motion } from "framer-motion";

const slideVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
};

export function MotionDivWrapper({
  children,
  visible,
}: {
  children: React.ReactNode;
  visible: boolean;
}) {
  return (
    visible && (
      <motion.div
        layout="position"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={slideVariants}
        transition={{
          x: { type: "tween", duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.3, ease: "easeOut" },
          layout: { type: "spring", stiffness: 400, damping: 32 },
        }}
      >
        {children}
      </motion.div>
    )
  );
}
