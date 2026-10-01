/**
 * Icon nút thu gọn/mở rộng sidebar (khung + mũi tên), lấy theo e-learning.
 * collapsed = true → mũi tên chỉ phải (mở lại); false → mũi tên chỉ trái (thu gọn).
 */
export default function SidebarToggleIcon({
  width = 20,
  height = 20,
  collapsed = false,
}: {
  width?: number;
  height?: number;
  collapsed?: boolean;
}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="10 10 17 17" fill="none" aria-hidden>
      {collapsed ? (
        <>
          <path
            d="M13.1006 11.5585L23.8886 11.5585C24.2973 11.5585 24.6893 11.7209 24.9783 12.0099C25.2673 12.2989 25.4297 12.6909 25.4297 13.0996L25.4297 23.8876C25.4297 24.2963 25.2673 24.6883 24.9783 24.9773C24.6893 25.2663 24.2973 25.4287 23.8886 25.4287L13.1006 25.4287C12.6919 25.4287 12.2999 25.2663 12.0109 24.9773C11.7218 24.6883 11.5595 24.2963 11.5595 23.8876L11.5595 13.0996C11.5595 12.6909 11.7218 12.2989 12.0109 12.0099C12.2999 11.7209 12.6919 11.5585 13.1006 11.5585Z"
            stroke="currentColor"
            strokeWidth="1.18747"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20.5985 20.0347L23.127 18.4936L20.5985 16.9525M17.3477 11.5585L17.3477 25.4287"
            stroke="currentColor"
            strokeWidth="1.18747"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M23.8877 25.4288H13.0997C12.691 25.4288 12.299 25.2664 12.01 24.9774C11.721 24.6884 11.5586 24.2964 11.5586 23.8877L11.5586 13.0997C11.5586 12.691 11.721 12.299 12.01 12.01C12.299 11.721 12.691 11.5586 13.0997 11.5586H23.8877C24.2964 11.5586 24.6884 11.721 24.9774 12.01C25.2664 12.299 25.4288 12.691 25.4288 13.0997L25.4288 23.8877C25.4288 24.2964 25.2664 24.6884 24.9774 24.9774C24.6884 25.2664 24.2964 25.4288 23.8877 25.4288Z"
            stroke="currentColor"
            strokeWidth="1.18747"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.3888 16.9526L13.8604 18.4937L16.3888 20.0348M19.6396 25.4288L19.6396 11.5586"
            stroke="currentColor"
            strokeWidth="1.18747"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
