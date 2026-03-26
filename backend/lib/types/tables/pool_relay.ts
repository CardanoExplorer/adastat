export default interface PoolRelayTable {
  port: number | null
  update_id: bigint
  dns_srv_name: string | null
  ipv4: string | null
  ipv6: string | null
  id: bigint
  dns_name: string | null
}
