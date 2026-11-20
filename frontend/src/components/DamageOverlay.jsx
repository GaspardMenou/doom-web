import React, {useEffect, useRef, useState} from 'react';

export function DamageOverlay({health, active}) {
  const previousHealth = useRef(health);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const damaged = active && health < previousHealth.current;
    previousHealth.current = health;
    setVisible(damaged);
    if (!damaged) return;
    const timer = setTimeout(() => setVisible(false), 180);
    return () => clearTimeout(timer);
  }, [health, active]);

  return <img className={`damage-overlay${active && visible ? ' is-visible' : ''}`}
    src="/art/damage-blood-overlay.png" alt="" aria-hidden="true" />;
}
