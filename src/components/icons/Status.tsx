export function StatusIcon({
  filled = false,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return filled ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
    >
      <path d="M236,69.4A16.13,16.13,0,0,0,224,64H176a48,48,0,0,0-96,0H32A16.13,16.13,0,0,0,16,80.31L29.77,206.16A16,16,0,0,0,45.74,224H210.26a16,16,0,0,0,16-17.84L240,80.31A16.13,16.13,0,0,0,236,69.4ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Z" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
    >
      <path d="M236,69.4A16.13,16.13,0,0,0,224,64H176a48,48,0,0,0-96,0H32A16.13,16.13,0,0,0,16,80.31L29.77,206.16A16,16,0,0,0,45.74,224H210.26a16,16,0,0,0,16-17.84L240,80.31A16.13,16.13,0,0,0,236,69.4ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm82.26,176H45.74L32,80H224Z" />
    </svg>
  );
}
